import { useEffect, useState } from 'react';
import type { AdminUser } from '../../services/adminApi';
import { adminApi } from '../../services/adminApi';
import { UserModal, UserModalMode } from './UserModal';

interface UserManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserManagementPanel({
  isOpen,
  onClose
}: UserManagementPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<UserModalMode>('create');
  const [selectedUser, setSelectedUser] = useState<AdminUser | undefined>();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await adminApi.listUsers({
          status: filter === 'all' ? undefined : filter,
          search: search || undefined
        });
        setUsers(data.users);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load accounts.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, filter, search]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(undefined);
    setModalOpen(true);
  };

  const openEditModal = (user: AdminUser) => {
    setModalMode('edit');
    setSelectedUser(user);
    setModalOpen(true);
  };

  const refreshUsers = async () => {
    const { data } = await adminApi.listUsers({
      status: filter === 'all' ? undefined : filter,
      search: search || undefined
    });
    setUsers(data.users);
  };

  const handleCreateOrUpdate = async (payload: {
    username?: string;
    displayName: string;
    role: 'analyst' | 'admin';
    password?: string;
  }) => {
    if (modalMode === 'create') {
      await adminApi.createUser({
        username: payload.username!,
        displayName: payload.displayName,
        role: payload.role,
        password: payload.password!
      });
    } else if (selectedUser) {
      await adminApi.updateUser(selectedUser.id, {
        displayName: payload.displayName,
        role: payload.role
      });
    }
    await refreshUsers();
  };

  const toggleStatus = async (user: AdminUser) => {
    if (user.status === 'active') {
      await adminApi.deactivateUser(user.id);
    } else {
      await adminApi.reactivateUser(user.id);
    }
    await refreshUsers();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" data-testid="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-panel-title">
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-white px-8 py-10 shadow-2xl" role="document">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-emerald-500">
              Admin
            </p>
            <h2 id="admin-panel-title" className="text-2xl font-semibold text-emerald-900">
              Account Management
            </h2>
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            onClick={onClose}
            aria-label="Close admin panel"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-full border border-emerald-100 px-4 py-2">
            {(['all', 'active', 'inactive'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`text-sm font-semibold uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                  filter === option
                    ? 'text-emerald-700'
                    : 'text-emerald-400 hover:text-emerald-600'
                }`}
                aria-pressed={filter === option}
              >
                {option}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search"
            className="flex-1 rounded-xl border border-emerald-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            type="button"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200"
            onClick={openCreateModal}
            data-testid="add-account-button"
          >
            Add account
          </button>
        </div>

        <div className="mt-6">
          {loading && <p className="text-sm text-emerald-500">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && (
            <table className="w-full table-fixed border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-emerald-500">
                  <th className="px-3">User</th>
                  <th className="px-3">Role</th>
                  <th className="px-3">Status</th>
                  <th className="px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="rounded-xl bg-emerald-50 text-sm text-emerald-900"
                    data-testid="admin-user-row"
                    data-username={user.username}
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold">{user.displayName}</p>
                      <p className="text-xs text-emerald-500">
                        {user.username}
                      </p>
                    </td>
                    <td className="px-3 py-3 capitalize">{user.role}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.status === 'active'
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-emerald-600">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          data-username={user.username}
                          data-testid="edit-user-button"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(user)}
                          data-username={user.username}
                          data-testid="toggle-user-button"
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <UserModal
        isOpen={modalOpen}
        mode={modalMode}
        initialUser={selectedUser}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
      />
    </div>
  );
}
