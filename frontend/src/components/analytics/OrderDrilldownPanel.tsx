import type { AnalyticsDrilldownResponse } from '@shared/index';
import { NoDataState } from './NoDataState';

interface Props {
  data: AnalyticsDrilldownResponse | null;
  loading: boolean;
  selectedCategory?: string | null;
  onClearCategory?: () => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  onPageChange: (page: number) => void;
}

const STATUS_OPTIONS = ['all', 'Pending', 'Fulfilled', 'Cancelled'];

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === 'fulfilled') return 'badge-green';
  if (s === 'cancelled') return 'badge-red';
  if (s === 'pending') return 'badge-amber';
  return 'badge-gray';
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function OrderDrilldownPanel({
  data,
  loading,
  selectedCategory,
  onClearCategory,
  statusFilter,
  onStatusChange,
  onPageChange
}: Props) {
  const records = data?.records ?? [];

  return (
    <div className="panel" data-testid="drilldown-panel">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-heading">Orders</p>
          <h3 className="text-base font-semibold text-gray-900 dark:text-emerald-100">
            Order Drill-down
          </h3>
          {selectedCategory && (
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              onClick={onClearCategory}
              data-testid="clear-drilldown-category"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              {selectedCategory}
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                statusFilter === status
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-emerald-500 dark:hover:bg-emerald-900/30'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-emerald-100 dark:border-white/[0.06]">
        {loading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-emerald-500 dark:text-emerald-400">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading orders...
          </div>
        ) : records.length === 0 ? (
          <NoDataState message="No orders matched the selected filters." />
        ) : (
          <table className="tbl" data-testid="drilldown-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Segment</th>
                <th>Category</th>
                <th>Status</th>
                <th className="text-right">Revenue</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="font-semibold text-gray-900 dark:text-emerald-100">
                    {record.orderNumber}
                  </td>
                  <td>{record.customerSegment}</td>
                  <td>{record.category}</td>
                  <td>
                    <span className={statusBadge(record.status)}>
                      {record.status}
                    </span>
                  </td>
                  <td className="text-right font-medium">{fmt.format(record.revenue)}</td>
                  <td className="text-gray-500 dark:text-emerald-500">{record.orderDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-emerald-600">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, data.page - 1))}
              disabled={data.page === 1}
              className="btn-sm btn-outline disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Prev
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(data.totalPages, data.page + 1))}
              disabled={data.page === data.totalPages}
              className="btn-sm btn-outline disabled:opacity-40"
            >
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
