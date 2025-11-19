import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../../db/pool';
const router = Router();
const DATA_DIR = path.join(process.cwd(), 'backend', '.data');
const STORE_PATH = path.join(DATA_DIR, 'integrations.json');
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
    catch { }
}
async function loadStore() {
    try {
        const raw = await fs.readFile(STORE_PATH, 'utf8');
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
async function saveStore(store) {
    await ensureDataDir();
    await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}
router.get('/status', async (_req, res) => {
    const host = process.env.PGHOST ?? '127.0.0.1';
    const port = Number(process.env.PGPORT ?? 5432);
    const database = process.env.PGDATABASE ?? 'sales_warehouse';
    const user = process.env.PGUSER;
    const hasEnv = Boolean(user && process.env.PGPASSWORD);
    let pingOk = false;
    let rowCount;
    if (hasEnv) {
        try {
            const client = await getPool().connect();
            try {
                await client.query('SELECT 1');
                pingOk = true;
                // Optional: count rows from target table
                const r = await client.query('SELECT COUNT(*)::bigint AS cnt FROM l4k_model.joinsales_orderline');
                rowCount = Number(r.rows[0]?.cnt ?? 0);
            }
            finally {
                client.release();
            }
        }
        catch {
            pingOk = false;
        }
    }
    res.json({
        db: {
            host,
            port,
            database,
            userMasked: user ? `${user.slice(0, 1)}***${user.slice(-1)}` : undefined,
            hasEnv,
            pingOk
        },
        table: {
            schema: 'l4k_model',
            name: 'joinsales_orderline',
            rowCount
        },
        endpoints: {
            rawOrders: '/api/analytics/orders/raw'
        },
        notes: {
            ssh: 'ssh -N -L 5432:127.0.0.1:5432 dbtunnel@49.0.67.25'
        }
    });
});
// Save Superset config (dev only, memory)
router.post('/superset/config', async (req, res) => {
    const { baseUrl, username, password } = req.body || {};
    if (typeof baseUrl !== 'string' ||
        typeof username !== 'string' ||
        typeof password !== 'string') {
        return res.status(400).json({ error: 'INVALID_PAYLOAD' });
    }
    const store = await loadStore();
    store.superset = store.superset ?? {
        baseUrl,
        username,
        password,
        dashboards: []
    };
    store.superset.baseUrl = baseUrl;
    store.superset.username = username;
    store.superset.password = password;
    await saveStore(store);
    res.json({ ok: true });
});
// Check Superset login using stored config
router.get('/superset/status', async (_req, res) => {
    const store = await loadStore();
    const config = store.superset;
    if (!config) {
        return res.json({ configured: false, loginOk: false });
    }
    try {
        const loginResp = await fetch(`${config.baseUrl.replace(/\/$/, '')}/api/v1/security/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'db',
                username: config.username,
                password: config.password,
                refresh: true
            })
        });
        if (!loginResp.ok) {
            const text = await loginResp.text();
            return res.status(200).json({ configured: true, loginOk: false, error: text, dashboards: config.dashboards });
        }
        const json = (await loginResp.json());
        const token = json?.access_token;
        const ok = typeof token === 'string' && token.length > 0;
        return res.json({ configured: true, loginOk: ok, dashboards: config.dashboards });
    }
    catch (err) {
        return res.status(200).json({ configured: true, loginOk: false, error: err.message });
    }
});
router.get('/superset/dashboards', async (_req, res) => {
    const store = await loadStore();
    res.json({ dashboards: store.superset?.dashboards ?? [] });
});
router.post('/superset/dashboards', async (req, res) => {
    const { title, url } = req.body || {};
    if (typeof title !== 'string' || typeof url !== 'string') {
        return res.status(400).json({ error: 'INVALID_PAYLOAD' });
    }
    const store = await loadStore();
    if (!store.superset)
        return res.status(400).json({ error: 'SUPERSET_NOT_CONFIGURED' });
    const item = { id: uuidv4(), title, url };
    store.superset.dashboards.push(item);
    await saveStore(store);
    res.status(201).json({ dashboard: item });
});
router.delete('/superset/dashboards/:id', async (req, res) => {
    const id = req.params.id;
    const store = await loadStore();
    if (!store.superset)
        return res.status(400).json({ error: 'SUPERSET_NOT_CONFIGURED' });
    const before = store.superset.dashboards.length;
    store.superset.dashboards = store.superset.dashboards.filter((d) => d.id !== id);
    if (store.superset.dashboards.length === before)
        return res.status(404).json({ error: 'NOT_FOUND' });
    await saveStore(store);
    res.json({ ok: true });
});
router.post('/nocodb/config', async (req, res) => {
    const { baseUrl, username, password } = req.body || {};
    if (typeof baseUrl !== 'string' ||
        typeof username !== 'string' ||
        typeof password !== 'string') {
        return res.status(400).json({ error: 'INVALID_PAYLOAD' });
    }
    const store = await loadStore();
    store.nocodb = {
        baseUrl,
        username,
        password
    };
    await saveStore(store);
    res.json({ ok: true });
});
router.get('/nocodb/status', async (_req, res) => {
    const store = await loadStore();
    if (!store.nocodb) {
        return res.json({ configured: false });
    }
    const { baseUrl, username } = store.nocodb;
    res.json({
        configured: true,
        baseUrl,
        usernameMasked: `${username.slice(0, 1)}***${username.slice(-1)}`
    });
});
export default router;
