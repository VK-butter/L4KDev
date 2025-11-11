import { randomUUID } from 'crypto';
import { mockDataStore } from '../../data/mocks';
const MAX_AUDIT_ENTRIES = 250;
export async function recordAuditEvent(entry) {
    const existing = await mockDataStore.getAuditLog();
    const nextEntry = {
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
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
