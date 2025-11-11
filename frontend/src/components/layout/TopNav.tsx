import { brandPalette, elevation } from '../../theme/tokens';
import type { SessionUser } from '../../hooks/useSession';

const navLinks = [
  { label: 'Overview', href: '#' },
  { label: 'Sales', href: '#' },
  { label: 'Integrations', href: '#' }
];

interface TopNavProps {
  user?: SessionUser | null;
  onLogout?: () => void;
  onAdminMenu?: () => void;
}

export function TopNav({ user, onLogout, onAdminMenu }: TopNavProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between border-b border-emerald-100 bg-white/90 px-8 py-4 backdrop-blur"
      style={{ boxShadow: elevation.nav }}
      role="banner"
      aria-label="Application header"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold"
          style={{ backgroundColor: brandPalette.brand[600] }}
        >
          SD
        </span>
        <div>
          <p className="text-sm uppercase tracking-widest text-emerald-500">
            Sale Dashboard
          </p>
          <p className="text-lg font-semibold text-emerald-900">
            Mock Intelligence Hub
          </p>
        </div>
      </div>

      <nav className="hidden items-center gap-6 text-sm font-medium text-emerald-900 md:flex" aria-label="Primary">
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="transition hover:text-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 focus-visible:rounded"
          >
            {link.label}
          </a>
        ))}
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
