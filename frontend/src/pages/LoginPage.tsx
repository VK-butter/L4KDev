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
        (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f5faf7] dark:bg-[#07130f]">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12"
        style={{
          background: `linear-gradient(135deg, ${brandPalette.brand[700]} 0%, ${brandPalette.brand[500]} 60%, ${brandPalette.accent[500]} 100%)`
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-sm font-bold text-white">
            SD
          </span>
          <span className="text-base font-semibold text-white/90">Learning for Kidz</span>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Sales Intelligence<br />Dashboard
            </h2>
            <p className="mt-4 text-base text-white/75 leading-relaxed max-w-sm">
              Real-time analytics, order management, and product insights — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Orders tracked', value: '5,000+' },
              { label: 'SKU categories', value: '12+' },
              { label: 'Data sources', value: '3' },
              { label: 'Reports', value: 'Live' }
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/60 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40">
          Green Sales Dashboard &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: brandPalette.brand[600] }}
            >
              SD
            </span>
            <span className="text-base font-semibold text-gray-900 dark:text-emerald-100">
              Learning for Kidz
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-emerald-50">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-emerald-400/80">
            Sign in to your dashboard account
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                className="input"
                value={formState.username}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, username: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={formState.password}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, password: event.target.value }))
                }
              />
            </div>

            {error && (
              <div
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 dark:border-red-800 dark:bg-red-900/30"
                role="alert"
                aria-live="assertive"
              >
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || status === 'loading'}
              className="btn-lg btn-primary w-full mt-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-emerald-600">
            Demo: admin@example.com / Admin!123
          </p>
        </div>
      </div>
    </div>
  );
}
