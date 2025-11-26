import { elevation } from '../../theme/tokens';
import type { SessionUser } from '../../hooks/useSession';
import { Link } from 'react-router-dom';

interface SidebarProps {
  user?: SessionUser | null;
}

type NavItem =
  | { label: string; to: string }
  | { label: string; href: string }
  | { label: string };

export function Sidebar({ user }: SidebarProps) {

  const navGroups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'Dashboards',
      items: [
        { label: 'Sale order line', to: '/dashboards/sales' },
        { label: 'Inventory' },
        { label: 'Product Sku', to: '/dashboards/product-sku' }
      ]
    },
    {
      title: 'NOCODB MASTER',
      items: [
        { label: 'ฐานข้อมูลสินค้า', to: '/nocodb?embed=nocodb-products' },
        { label: 'ประเภทลูกค้า', to: '/nocodb?embed=nocodb-customer-types' },
        { label: 'Condition SKU', to: '/nocodb?embed=nocodb-condition-sku' },
        { label: 'เป้ายอดขาย', to: '/nocodb?embed=nocodb-sales-target' }
      ]
    },
    ...(user?.role === 'admin'
      ? [
          {
            title: 'Admin',
            items: [{ label: 'Account Management' }, { label: 'Audit Trail' }]
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
              <li key={item.label}>
                {'to' in item ? (
                  <Link
                    to={item.to}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    aria-label={item.label}
                  >
                    {item.label}
                  </Link>
                ) : 'href' in item ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    aria-label={`${item.label} (opens new tab)`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="w-full cursor-not-allowed rounded-lg px-3 py-2 text-left text-sm font-medium text-emerald-400"
                    aria-label={item.label}
                    disabled
                  >
                    {item.label}
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
