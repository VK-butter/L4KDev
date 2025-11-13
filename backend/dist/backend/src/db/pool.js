import { Pool } from 'pg';
let pool = null;
export function getPool() {
    if (pool)
        return pool;
    const host = process.env.PGHOST ?? '127.0.0.1';
    const port = Number(process.env.PGPORT ?? 5432);
    const database = process.env.PGDATABASE ?? 'sales_warehouse';
    const user = process.env.PGUSER;
    const password = process.env.PGPASSWORD;
    if (!user || !password) {
        throw new Error('Database environment not configured (PGUSER/PGPASSWORD missing)');
    }
    pool = new Pool({ host, port, database, user, password });
    return pool;
}
export async function pingDb() {
    const client = await getPool().connect();
    try {
        await client.query('SELECT 1');
    }
    finally {
        client.release();
    }
}
