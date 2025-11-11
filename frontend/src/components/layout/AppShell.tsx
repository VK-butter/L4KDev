import { PropsWithChildren } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import type { SessionUser } from '../../hooks/useSession';

interface AppShellProps extends PropsWithChildren {
  user?: SessionUser | null;
  onLogout?: () => void;
  onAdminMenu?: () => void;
}

export function AppShell({ children, user, onLogout, onAdminMenu }: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface-base text-emerald-950">
      <a
        href="#main-content"
        className="absolute left-2 top-2 -translate-y-16 rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white focus:translate-y-0 focus:outline-none"
      >
        Skip to main content
      </a>
      <TopNav user={user} onLogout={onLogout} onAdminMenu={onAdminMenu} />
      <div className="flex">
        <Sidebar user={user} />
        <main className="flex-1 px-6 py-8" id="main-content" role="main" aria-label="Main content">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
