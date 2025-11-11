import type { UserAccount, AuditLogEntry } from '@shared/index';
import { apiClient } from './apiClient';

export type AdminUser = Omit<UserAccount, 'passwordHash'>;

export interface CreateUserPayload {
  username: string;
  displayName: string;
  role: 'analyst' | 'admin';
  password: string;
}

export interface UpdateUserPayload {
  displayName?: string;
  role?: 'analyst' | 'admin';
}

export const adminApi = {
  listUsers: (params?: { status?: 'active' | 'inactive'; search?: string }) =>
    apiClient.get<{ users: AdminUser[] }>('/admin/users', { params }),
  createUser: (payload: CreateUserPayload) =>
    apiClient.post<{ user: AdminUser }>('/admin/users', payload),
  updateUser: (id: string, payload: UpdateUserPayload) =>
    apiClient.patch<{ user: AdminUser }>(`/admin/users/${id}`, payload),
  deactivateUser: (id: string) =>
    apiClient.post<{ user: AdminUser }>(`/admin/users/${id}/deactivate`, {}),
  reactivateUser: (id: string) =>
    apiClient.post<{ user: AdminUser }>(`/admin/users/${id}/reactivate`, {}),
  listAudit: () => apiClient.get<{ entries: AuditLogEntry[] }>('/admin/audit')
};
