import { PropsWithChildren, useState } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import type { SessionUser } from '../../hooks/useSession';

interface AppShellProps extends PropsWithChildren {
  user?: SessionUser | null;
  onLogout?: () => void;
  onAdminMenu?: () => void;
}

export function AppShell({ children, user, onLogout, onAdminMenu }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="min-h-screen bg-[#f5faf7] text-gray-900 transition-colors duration-200 dark:bg-[#07130f] dark:text-emerald-100">
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
          className="flex-1 min-w-0 px-5 py-7 transition-colors duration-200 dark:bg-[#07130f]"
          id="main-content"
          role="main"
          aria-label="Main content"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
