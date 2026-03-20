import { elevation } from '../../theme/tokens';
import type { SessionUser } from '../../hooks/useSession';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  user?: SessionUser | null;
}

type NavItem =
  | { label: string; to: string; icon: React.ReactNode }
  | { label: string; href: string; icon: React.ReactNode }
  | { label: string; icon: React.ReactNode };

const BarChartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const BoxIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);
const TagIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const UsersIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const TableIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" />
  </svg>
);
const TargetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);
const ClipboardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);
const PlugIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export function Sidebar({ user }: SidebarProps) {
  const location = useLocation();

  const navGroups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'Dashboards',
      items: [
        { label: 'ภาพรวมยอดขาย', to: '/dashboards/sales', icon: <BarChartIcon /> },
        { label: 'ยอดขายรายช่องทาง VS', to: '/dashboards/sales-by-channel', icon: <UsersIcon /> },
        { label: 'ยอดขาย VS เป้า', to: '/dashboards/sales-vs-target', icon: <TargetIcon /> },
        { label: 'Inventory', icon: <BoxIcon /> },
        { label: 'Product SKU', to: '/dashboards/product-sku', icon: <TagIcon /> }
      ]
    },
    {
      title: 'NocoDB Master',
      items: [
        { label: 'ฐานข้อมูลสินค้า', to: '/nocodb?embed=nocodb-products', icon: <TableIcon /> },
        { label: 'ประเภทลูกค้า', to: '/nocodb?embed=nocodb-customer-types', icon: <UsersIcon /> },
        { label: 'Condition SKU', to: '/nocodb?embed=nocodb-condition-sku', icon: <TagIcon /> },
        { label: 'เป้ายอดขาย', to: '/nocodb?embed=nocodb-sales-target', icon: <TargetIcon /> }
      ]
    },
    ...(user?.role === 'admin'
      ? [
          {
            title: 'Admin',
            items: [
              { label: 'Integrations', to: '/integrations', icon: <PlugIcon /> },
              { label: 'Account Management', icon: <UsersIcon /> },
              { label: 'Audit Trail', icon: <ClipboardIcon /> }
            ]
          }
        ]
      : [])
  ];

  return (
    <aside
      className="animate-fade-in sticky top-16 hidden h-[calc(100vh-4rem)] w-64 flex-shrink-0 self-start overflow-y-auto border-r px-4 py-6 transition-colors duration-200 lg:flex lg:flex-col"
      style={{
        boxShadow: elevation.sidebar,
        borderColor: 'color-mix(in oklch, var(--app-surface-border) 76%, transparent)',
        background: 'var(--app-sidebar)'
      }}
      aria-label="Dashboard navigation"
      role="complementary"
    >
      {navGroups.map((group, gi) => (
        <div key={group.title} className={gi > 0 ? 'mt-6 pt-4 border-t border-[var(--app-surface-border)]/40' : ''}>
          <p className="section-heading px-2 mb-2.5">
            {group.title}
          </p>
          <ul className="space-y-1" role="list">
            {group.items.map((item) => {
              const isActive = 'to' in item && location.pathname + location.search === item.to;
              const baseClass = `flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400`;
              const activeClass = 'border-emerald-400 bg-white text-[var(--app-accent-ink)] shadow-sm dark:border-emerald-600/60 dark:bg-emerald-950/60 dark:text-emerald-200';
              const inactiveClass = 'border-transparent text-[var(--app-muted-text)] hover:border-emerald-200/80 hover:bg-white/70 hover:text-[var(--app-text)] dark:hover:border-emerald-800/60 dark:hover:bg-white/[0.06] dark:hover:text-[var(--app-text)]';
              const disabledClass = 'cursor-not-allowed text-[var(--app-muted-text)] opacity-60';

              return (
                <li key={item.label}>
                  {'to' in item ? (
                    <Link
                      to={item.to}
                      className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-500/60 dark:text-emerald-600'}>
                        {item.icon}
                      </span>
                      {item.label}
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                      )}
                    </Link>
                  ) : 'href' in item ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`${baseClass} ${inactiveClass}`}
                      aria-label={`${item.label} (opens new tab)`}
                    >
                      <span className="text-emerald-500/60 dark:text-emerald-600">{item.icon}</span>
                      {item.label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className={`${baseClass} ${disabledClass}`}
                      aria-label={item.label}
                      disabled
                    >
                      <span className="opacity-40">{item.icon}</span>
                      {item.label}
                      <span className="ml-auto">
                        <LockIcon />
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
