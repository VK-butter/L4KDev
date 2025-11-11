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

  if (!loading && records.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-emerald-900">
            Order Drill-down
          </p>
        </div>
        <NoDataState message="No orders matched the selected filters." />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
      data-testid="drilldown-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            Order Drill-down
          </p>
          {selectedCategory && (
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-widest text-emerald-500"
              onClick={onClearCategory}
              data-testid="clear-drilldown-category"
            >
              Category: {selectedCategory} ×
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-600">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              className={
                statusFilter === status
                  ? 'text-emerald-700'
                  : 'text-emerald-400 hover:text-emerald-600'
              }
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-emerald-400">
            Loading…
          </div>
        ) : (
          <table
            className="min-w-full text-sm text-emerald-900"
            data-testid="drilldown-table"
          >
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-emerald-500">
                <th className="py-2">Order</th>
                <th className="py-2">Segment</th>
                <th className="py-2">Category</th>
                <th className="py-2">Status</th>
                <th className="py-2">Revenue</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-t border-emerald-50">
                  <td className="py-3 font-semibold">{record.orderNumber}</td>
                  <td className="py-3">{record.customerSegment}</td>
                  <td className="py-3">{record.category}</td>
                  <td className="py-3">{record.status}</td>
                  <td className="py-3">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0
                    }).format(record.revenue)}
                  </td>
                  <td className="py-3">{record.orderDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-emerald-600">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, data.page - 1))}
            disabled={data.page === 1}
            className="disabled:text-emerald-300"
          >
            Previous
          </button>
          <p>
            Page {data.page} / {data.totalPages}
          </p>
          <button
            type="button"
            onClick={() =>
              onPageChange(Math.min(data.totalPages, data.page + 1))
            }
            disabled={data.page === data.totalPages}
            className="disabled:text-emerald-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
