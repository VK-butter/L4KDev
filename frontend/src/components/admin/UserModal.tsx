import { FormEvent, useEffect, useState } from 'react';
import type { AdminUser } from '../../services/adminApi';

export type UserModalMode = 'create' | 'edit';

export interface UserModalProps {
  mode: UserModalMode;
  initialUser?: AdminUser;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    username?: string;
    displayName: string;
    role: 'analyst' | 'admin';
    password?: string;
  }) => Promise<void>;
}

export function UserModal({ mode, initialUser, isOpen, onClose, onSubmit }: UserModalProps) {
  const [formState, setFormState] = useState(() => ({
    username: initialUser?.username ?? '',
    displayName: initialUser?.displayName ?? '',
    role: initialUser?.role ?? 'analyst',
    password: ''
  }));

  useEffect(() => {
    setFormState({ username: initialUser?.username ?? '', displayName: initialUser?.displayName ?? '', role: initialUser?.role ?? 'analyst', password: '' });
  }, [initialUser, mode, isOpen]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const title = mode === 'create' ? 'Add Account' : 'Edit Account';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ username: formState.username, displayName: formState.displayName, role: formState.role, password: formState.password });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save account. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      data-testid="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl dark:bg-[#0f2119]">
        <div className="mb-6 flex items-center justify-between">
          <h3 id="user-modal-title" className="text-lg font-bold text-gray-900 dark:text-emerald-50">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close user modal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 dark:text-emerald-500 dark:hover:bg-emerald-900/40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-1.5">Email</label>
              <input type="email" required autoFocus className="input" value={formState.username}
                onChange={(e) => setFormState((p) => ({ ...p, username: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-1.5">Display name</label>
            <input type="text" required autoFocus={mode !== 'create'} className="input" value={formState.displayName}
              onChange={(e) => setFormState((p) => ({ ...p, displayName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-1.5">Role</label>
            <select className="input" value={formState.role}
              onChange={(e) => setFormState((p) => ({ ...p, role: e.target.value as 'analyst' | 'admin' }))}>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-1.5">Temporary password</label>
              <input type="password" required minLength={8} className="input" value={formState.password}
                onChange={(e) => setFormState((p) => ({ ...p, password: e.target.value }))} />
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-900/20" role="alert" id="user-modal-error">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          <button type="submit" disabled={submitting} data-testid="user-modal-save" className="btn-lg btn-primary w-full mt-1">
            {submitting ? 'Saving...' : 'Save Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
