import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  SalesOrder,
  UserAccount,
  EmbeddingTarget,
  AuditLogEntry
} from '@shared/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'files');

type DatasetKey = 'orders' | 'users' | 'embeds' | 'audit';

const FILE_MAP: Record<DatasetKey, string> = {
  orders: 'orders.json',
  users: 'users.json',
  embeds: 'embeds.json',
  audit: 'audit-log.json'
};

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(key: DatasetKey): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, FILE_MAP[key]);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(filePath, '[]', 'utf-8');
      return [] as T;
    }
    throw error;
  }
}

async function writeJson<T>(key: DatasetKey, payload: T): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, FILE_MAP[key]);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return payload;
}

export const mockDataStore = {
  getOrders: () => readJson<SalesOrder[]>('orders'),
  saveOrders: (records: SalesOrder[]) => writeJson('orders', records),
  getUsers: () => readJson<UserAccount[]>('users'),
  saveUsers: (records: UserAccount[]) => writeJson('users', records),
  getEmbeds: () => readJson<EmbeddingTarget[]>('embeds'),
  saveEmbeds: (records: EmbeddingTarget[]) => writeJson('embeds', records),
  getAuditLog: () => readJson<AuditLogEntry[]>('audit'),
  saveAuditLog: (records: AuditLogEntry[]) => writeJson('audit', records)
};
