import type { AnalyticsSummary } from '@shared/index';

interface KpiBoardProps {
  summary?: AnalyticsSummary | null;
  loading: boolean;
  error?: string | null;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

const kpiConfig = [
  {
    label: 'Total Orders',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400'
  },
  {
    label: 'Total Revenue',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400'
  },
  {
    label: 'Avg Order Value',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/40 dark:text-violet-400'
  },
  {
    label: 'Growth vs Prior',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400'
  }
];

export function KpiBoard({ summary, loading, error }: KpiBoardProps) {
  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-sm font-medium text-red-700 dark:text-red-300">
          Unable to load KPIs. {error}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="kpi-board">
      {kpiConfig.map(({ label, icon, color }, index) => {
        const value = loading || !summary ? null : formatValue(index, summary);
        const isGrowth = index === 3;
        const growthPositive = isGrowth && summary && summary.growthVsPrior >= 0;

        return (
          <div key={label} className="panel group flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="section-heading">{label}</p>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                {icon}
              </span>
            </div>
            <div>
              {loading ? (
                <div className="skeleton h-8 w-28" />
              ) : (
                <p className={`text-2xl font-bold tracking-tight ${
                  isGrowth
                    ? growthPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500 dark:text-red-400'
                    : 'text-gray-900 dark:text-emerald-50'
                }`}>
                  {isGrowth && growthPositive && '+'}
                  {value ?? '—'}
                </p>
              )}
              {isGrowth && !loading && summary && (
                <p className="mt-1 text-xs text-gray-400 dark:text-emerald-600">
                  vs previous period
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatValue(index: number, summary: AnalyticsSummary) {
  switch (index) {
    case 0: return summary.totalOrders.toLocaleString();
    case 1: return currency.format(summary.totalRevenue);
    case 2: return currency.format(summary.averageOrderValue);
    case 3: return `${(summary.growthVsPrior * 100).toFixed(1)}%`;
    default: return '—';
  }
}
