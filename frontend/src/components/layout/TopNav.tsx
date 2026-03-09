import { brandPalette, elevation } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { SessionUser } from '../../hooks/useSession';
import { useState } from 'react';

interface TopNavProps {
  user?: SessionUser | null;
  onLogout?: () => void;
  onAdminMenu?: () => void;
  onToggleSidebar?: () => void;
}

export function TopNav({ user, onLogout, onAdminMenu, onToggleSidebar }: TopNavProps) {
  const [logoError, setLogoError] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const logoUrl = import.meta.env.VITE_BRAND_LOGO_URL ?? '/brand/logo.png';

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'SD';

  return (
    <header
      className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-emerald-100/60 bg-white/95 px-4 backdrop-blur-md transition-colors duration-200 dark:border-white/[0.07] dark:bg-[#0a1c12]/95"
      style={{ boxShadow: elevation.nav }}
      role="banner"
      aria-label="Application header"
    >
      {/* Left: hamburger + brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          {(!logoError && logoUrl) ? (
            <img
              src={logoUrl}
              alt="Brand logo"
              className="h-9 w-9 rounded-xl object-contain bg-white border border-emerald-100 dark:border-white/10"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: brandPalette.brand[600] }}
            >
              SD
            </span>
          )}
          <div className="hidden sm:block leading-none">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-500 dark:text-emerald-400">
              Sales Dashboard
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-emerald-100">
              Learning for Kidz
            </p>
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-pressed={theme === 'dark'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Admin button */}
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={onAdminMenu}
            data-testid="admin-menu-button"
            className="btn-sm btn-outline hidden sm:inline-flex"
            aria-label="Open admin menu"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Admin</span>
          </button>
        )}

        {/* User info */}
        <div className="hidden items-center gap-2.5 border-l border-emerald-100 pl-3 dark:border-white/10 md:flex">
          <div className="text-right leading-none">
            <p className="text-sm font-semibold text-gray-900 dark:text-emerald-100">
              {user?.displayName ?? 'Guest'}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
              {user?.role ?? ''}
            </p>
          </div>
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: brandPalette.brand[600] }}
            aria-hidden
          >
            {initials}
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          className="btn-sm btn-ghost"
          aria-label="Sign out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
