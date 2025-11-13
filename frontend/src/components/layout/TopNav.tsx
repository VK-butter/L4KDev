import { brandPalette, elevation } from '../../theme/tokens';
import type { SessionUser } from '../../hooks/useSession';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const navLinks = [
  { label: 'Overview', href: '/' },
  { label: 'Sales', href: '/' },
  { label: 'Integrations', href: '/integrations' }
];

interface TopNavProps {
  user?: SessionUser | null;
  onLogout?: () => void;
  onAdminMenu?: () => void;
  onToggleSidebar?: () => void;
}

export function TopNav({ user, onLogout, onAdminMenu, onToggleSidebar }: TopNavProps) {
  const location = useLocation();
  const [logoError, setLogoError] = useState(false);
  const logoUrl = (import.meta as any)?.env?.VITE_BRAND_LOGO_URL || '/brand/logo.png';
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between border-b border-emerald-100 bg-white/90 px-8 py-4 backdrop-blur"
      style={{ boxShadow: elevation.nav }}
      role="banner"
      aria-label="Application header"
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="mr-1 inline-flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg border border-emerald-100 bg-white text-emerald-700 shadow-sm hover:border-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
          aria-label="Toggle sidebar"
        >
          {/* simple hamburger icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {(!logoError && logoUrl) ? (
          <img
            src={logoUrl}
            alt="Learning for Kidz logo"
            className="h-12 w-12 md:h-14 md:w-14 rounded-2xl object-contain bg-white border border-emerald-100"
            onError={() => setLogoError(true)}
          />
        ) : (
          <span
            className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl text-white font-bold"
            style={{ backgroundColor: brandPalette.brand[600] }}
          >
            SD
          </span>
        )}
        <div>
          <p className="text-sm uppercase tracking-widest text-emerald-500">
            Sale Dashboard
          </p>
          <p className="text-lg font-semibold text-emerald-900">
            Learning for Kidz
          </p>
        </div>
      </div>

      <nav className="hidden items-center gap-6 text-sm font-medium text-emerald-900 md:flex" aria-label="Primary">
        {navLinks.map((link) => {
          const active = location.pathname === link.href;
          return (
            <Link
              key={link.label}
              to={link.href}
              className={`transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 focus-visible:rounded ${
                active ? 'text-emerald-600' : 'hover:text-emerald-500'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-4">
        <div className="hidden text-right text-sm font-medium text-emerald-900 md:block">
          <p>{user?.displayName ?? 'Guest'}</p>
          <p className="text-emerald-500 text-xs uppercase tracking-widest">
            {user?.role ?? 'role'}
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={onAdminMenu}
            data-testid="admin-menu-button"
            className="rounded-full border border-emerald-100 bg-white px-4 py-1 text-sm font-medium text-emerald-700 shadow-sm transition hover:border-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            aria-label="Open admin menu"
          >
            Admin Menu
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-emerald-200 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-emerald-700 transition hover:border-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
          aria-label="Sign out"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
