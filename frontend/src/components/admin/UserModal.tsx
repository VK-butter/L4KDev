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

export function UserModal({
  mode,
  initialUser,
  isOpen,
  onClose,
  onSubmit
}: UserModalProps) {
  const [formState, setFormState] = useState(() => ({
    username: initialUser?.username ?? '',
    displayName: initialUser?.displayName ?? '',
    role: initialUser?.role ?? 'analyst',
    password: ''
  }));

  useEffect(() => {
    setFormState({
      username: initialUser?.username ?? '',
      displayName: initialUser?.displayName ?? '',
      role: initialUser?.role ?? 'analyst',
      password: ''
    });
  }, [initialUser, mode, isOpen]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const title = mode === 'create' ? 'Add Account' : 'Edit Account';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        username: formState.username,
        displayName: formState.displayName,
        role: formState.role,
        password: formState.password
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save account. Please retry.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      data-testid="user-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 id="user-modal-title" className="text-xl font-semibold text-emerald-900">
            {title}
          </h3>
          <button
            className="text-sm font-medium text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            type="button"
            onClick={onClose}
            aria-label="Close user modal"
          >
            Close
          </button>
        </div>
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {mode === 'create' && (
            <label className="block text-sm font-medium text-emerald-900">
              Email
              <input
                type="email"
                required
                className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-emerald-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={formState.username}
                autoFocus
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    username: event.target.value
                  }))
                }
              />
            </label>
          )}
          <label className="block text-sm font-medium text-emerald-900">
            Display name
            <input
              type="text"
              required
              className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-emerald-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              value={formState.displayName}
              autoFocus={mode !== 'create'}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  displayName: event.target.value
                }))
              }
            />
          </label>

          <label className="block text-sm font-medium text-emerald-900">
            Role
            <select
              className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-emerald-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              value={formState.role}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  role: event.target.value as 'analyst' | 'admin'
                }))
              }
            >
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {mode === 'create' && (
            <label className="block text-sm font-medium text-emerald-900">
              Temporary password
              <input
                type="password"
                required
                minLength={8}
                className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-emerald-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={formState.password}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    password: event.target.value
                  }))
                }
              />
            </label>
          )}

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert" id="user-modal-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            data-testid="user-modal-save"
            className="w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
