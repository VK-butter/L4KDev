import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'files');
const FILE_MAP = {
    orders: 'orders.json',
    users: 'users.json',
    embeds: 'embeds.json',
    audit: 'audit-log.json'
};
async function ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}
async function readJson(key) {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, FILE_MAP[key]);
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(filePath, '[]', 'utf-8');
            return [];
        }
        throw error;
    }
}
async function writeJson(key, payload) {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, FILE_MAP[key]);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return payload;
}
export const mockDataStore = {
    getOrders: () => readJson('orders'),
    saveOrders: (records) => writeJson('orders', records),
    getUsers: () => readJson('users'),
    saveUsers: (records) => writeJson('users', records),
    getEmbeds: () => readJson('embeds'),
    saveEmbeds: (records) => writeJson('embeds', records),
    getAuditLog: () => readJson('audit'),
    saveAuditLog: (records) => writeJson('audit', records)
};
