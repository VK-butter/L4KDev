import { elevation } from '../../theme/tokens';
import type { SessionUser } from '../../hooks/useSession';
import { Link } from 'react-router-dom';

interface SidebarProps {
  user?: SessionUser | null;
}

export function Sidebar({ user }: SidebarProps) {
  const navGroups = [
    {
      title: 'Dashboards',
      items: ['Sale order line', 'Inventory', 'Channel Mix']
    },
    {
      title: 'Embeds',
      items: ['Superset Placeholder', 'NocoDB Placeholder']
    },
    ...(user?.role === 'admin'
      ? [
          {
            title: 'Admin',
            items: ['Account Management', 'Audit Trail']
          }
        ]
      : [])
  ];

  return (
    <aside
      className="hidden w-72 flex-shrink-0 flex-col gap-6 border-r border-emerald-100 bg-white px-6 py-6 lg:flex sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto"
      style={{ boxShadow: elevation.sidebar }}
      aria-label="Dashboard navigation"
      role="complementary"
    >
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            {group.title}
          </p>
          <ul className="mt-3 space-y-1" role="list">
            {group.items.map((item) => (
              <li key={item}>
                {item === 'Sale order line' ? (
                  <Link
                    to="/dashboards/sales"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    aria-label={item}
                  >
                    {item}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    aria-label={item}
                  >
                    {item}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
