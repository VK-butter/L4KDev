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

export function KpiBoard({ summary, loading, error }: KpiBoardProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-700">
          Unable to load KPIs. {error}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4" data-testid="kpi-board">
      {['Total Orders', 'Total Revenue', 'Average Order Value', 'Growth vs Prior'].map(
        (label, index) => (
          <div
            key={label}
            className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-widest text-emerald-500">
              {label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-emerald-900">
              {loading || !summary
                ? '—'
                : formatValue(index, summary)}
            </p>
          </div>
        )
      )}
    </div>
  );
}

function formatValue(index: number, summary: AnalyticsSummary) {
  switch (index) {
    case 0:
      return summary.totalOrders.toLocaleString();
    case 1:
      return currency.format(summary.totalRevenue);
    case 2:
      return currency.format(summary.averageOrderValue);
    case 3:
      return `${(summary.growthVsPrior * 100).toFixed(1)}%`;
    default:
      return '—';
  }
}
