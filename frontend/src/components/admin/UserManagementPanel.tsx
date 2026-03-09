import { useEffect, useState } from 'react';
import type { AdminUser } from '../../services/adminApi';
import { adminApi } from '../../services/adminApi';
import { UserModal, UserModalMode } from './UserModal';

interface UserManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function statusBadge(status: string) {
  return status === 'active' ? 'badge-green' : 'badge-amber';
}

export function UserManagementPanel({ isOpen, onClose }: UserManagementPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<UserModalMode>('create');
  const [selectedUser, setSelectedUser] = useState<AdminUser | undefined>();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await adminApi.listUsers({ status: filter === 'all' ? undefined : filter, search: search || undefined });
        setUsers(data.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load accounts.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [isOpen, filter, search]);

  const openCreateModal = () => { setModalMode('create'); setSelectedUser(undefined); setModalOpen(true); };
  const openEditModal = (user: AdminUser) => { setModalMode('edit'); setSelectedUser(user); setModalOpen(true); };

  const refreshUsers = async () => {
    const { data } = await adminApi.listUsers({ status: filter === 'all' ? undefined : filter, search: search || undefined });
    setUsers(data.users);
  };

  const handleCreateOrUpdate = async (payload: { username?: string; displayName: string; role: 'analyst' | 'admin'; password?: string; }) => {
    if (modalMode === 'create') {
      await adminApi.createUser({ username: payload.username!, displayName: payload.displayName, role: payload.role, password: payload.password! });
    } else if (selectedUser) {
      await adminApi.updateUser(selectedUser.id, { displayName: payload.displayName, role: payload.role });
    }
    await refreshUsers();
  };

  const toggleStatus = async (user: AdminUser) => {
    if (user.status === 'active') await adminApi.deactivateUser(user.id);
    else await adminApi.reactivateUser(user.id);
    await refreshUsers();
  };

  const deleteUserAccount = async (user: AdminUser) => {
    if (user.status !== 'inactive') return;
    await adminApi.deleteUser(user.id);
    await refreshUsers();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" data-testid="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-panel-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto bg-white px-7 py-8 shadow-2xl dark:bg-[#0a1c12]" role="document">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="section-heading">Admin</p>
            <h2 id="admin-panel-title" className="text-xl font-bold text-gray-900 dark:text-emerald-50">Account Management</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close admin panel"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-emerald-400 dark:hover:bg-emerald-900/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50/60 p-1 dark:border-white/10 dark:bg-emerald-900/20">
            {(['all', 'active', 'inactive'] as const).map((option) => (
              <button key={option} type="button" onClick={() => setFilter(option)} aria-pressed={filter === option}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  filter === option
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-emerald-800 dark:text-emerald-200'
                    : 'text-gray-500 hover:text-gray-700 dark:text-emerald-500 dark:hover:text-emerald-300'
                }`}>
                {option}
              </button>
            ))}
          </div>
          <input type="search" placeholder="Search accounts..." className="input flex-1 min-w-0"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" className="btn-md btn-primary" onClick={openCreateModal} data-testid="add-account-button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add account
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>
        )}
        {!loading && !error && (
          <div className="space-y-2">
            {users.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-emerald-600">No accounts found.</p>
            )}
            {users.map((user) => (
              <div key={user.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-100/80 bg-white px-4 py-3 dark:border-white/[0.07] dark:bg-[#0f2119]/80"
                data-testid="admin-user-row" data-username={user.username}>
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                  {user.displayName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-gray-900 dark:text-emerald-100">{user.displayName}</p>
                  <p className="truncate text-xs text-gray-400 dark:text-emerald-600">{user.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-gray capitalize">{user.role}</span>
                  <span className={statusBadge(user.status)}>{user.status}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openEditModal(user)} data-username={user.username} data-testid="edit-user-button" className="btn-sm btn-ghost text-xs">Edit</button>
                  <button type="button" onClick={() => toggleStatus(user)} data-username={user.username} data-testid="toggle-user-button" className="btn-sm btn-ghost text-xs">
                    {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </button>
                  {user.status === 'inactive' && (
                    <button type="button" onClick={() => deleteUserAccount(user)} data-username={user.username} data-testid="delete-user-button" className="btn-sm btn-danger text-xs">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <UserModal isOpen={modalOpen} mode={modalMode} initialUser={selectedUser}
        onClose={() => setModalOpen(false)} onSubmit={handleCreateOrUpdate} />
    </div>
  );
}
