import { FormEvent, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { brandPalette } from '../theme/tokens';

export function LoginPage() {
  const { login, status } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [formState, setFormState] = useState({
    username: 'admin@example.com',
    password: 'Admin!123'
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(formState.username, formState.password);
      const redirectTo =
        (location.state as { from?: { pathname?: string } })?.from?.pathname ??
        '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Invalid credentials. Try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-emerald-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-2xl shadow-emerald-100 border border-emerald-100">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white"
            style={{ backgroundColor: brandPalette.brand[600] }}
          >
            SD
          </div>
          <h1 className="text-2xl font-semibold text-emerald-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-emerald-600">
            Sign in to access the Green Sales Dashboard prototype.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-emerald-900">
            Email
            <input
              type="email"
              required
              className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-emerald-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              value={formState.username}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  username: event.target.value
                }))
              }
            />
          </label>

          <label className="block text-sm font-medium text-emerald-900">
            Password
            <input
              type="password"
              required
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

          {error && (
            <p
              className="text-sm font-medium text-red-600"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || status === 'loading'}
            className="w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs uppercase tracking-widest text-emerald-500">
          Demo credentials provided above
        </p>
      </div>
    </div>
  );
}
