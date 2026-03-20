import { PropsWithChildren, useState } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '../common/ErrorBoundary';
import type { SessionUser } from '../../hooks/useSession';

interface AppShellProps extends PropsWithChildren {
  user?: SessionUser | null;
  onLogout?: () => void;
  onAdminMenu?: () => void;
}

export function AppShell({ children, user, onLogout, onAdminMenu }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="min-h-screen text-[var(--app-text)] transition-colors duration-200">
      <a
        href="#main-content"
        className="absolute left-2 top-2 -translate-y-16 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white focus:translate-y-0 focus:outline-none"
      >
        Skip to main content
      </a>
      <TopNav user={user} onLogout={onLogout} onAdminMenu={onAdminMenu} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex">
        {sidebarOpen && <Sidebar user={user} />}
        <main
          className="relative min-w-0 flex-1 px-5 py-7 transition-colors duration-200"
          id="main-content"
          role="main"
          aria-label="Main content"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70 blur-3xl"
            style={{
              background:
                'linear-gradient(90deg, color-mix(in oklch, var(--app-glow-a) 70%, transparent), transparent 42%, color-mix(in oklch, var(--app-glow-b) 70%, transparent))'
            }}
            aria-hidden
          />
          <div className="mx-auto flex max-w-7xl flex-col gap-5">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
