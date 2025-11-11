import { randomUUID } from 'crypto';
import type { AuditLogEntry } from '@shared/index';
import { mockDataStore } from '../../data/mocks';

const MAX_AUDIT_ENTRIES = 250;

export async function recordAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  const existing = await mockDataStore.getAuditLog();
  const nextEntry: AuditLogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry
  };

  const updated = [nextEntry, ...existing].slice(0, MAX_AUDIT_ENTRIES);
  await mockDataStore.saveAuditLog(updated);
  return nextEntry;
}

export async function listAuditEntries() {
  const entries = await mockDataStore.getAuditLog();
  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
