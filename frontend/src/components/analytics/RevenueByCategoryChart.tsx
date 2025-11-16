import type { AnalyticsCategoryBreakdown } from '@shared/index';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { NoDataState } from './NoDataState';
import { useCallback } from 'react';

type BarClickPayload = {
  payload?: {
    category?: string;
  };
  category?: string;
};

interface Props {
  data: AnalyticsCategoryBreakdown[];
  loading: boolean;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
}

export function RevenueByCategoryChart({
  data,
  loading,
  selectedCategory,
  onSelectCategory
}: Props) {
  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as Element | null;
      if (!target) return;
      const cell = target.closest('[data-category]') as HTMLElement | null;
      const category = cell?.getAttribute('data-category') ?? undefined;
      if (category) {
        onSelectCategory?.(category === selectedCategory ? null : category);
      }
    },
    [onSelectCategory, selectedCategory]
  );
  if (!loading && data.length === 0) {
    return <NoDataState message="No category data for this filter range." />;
  }

  return (
    <div
      className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
      data-testid="category-chart"
      role="region"
      aria-label="Revenue by Category chart"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-emerald-900">
          Revenue by Category
        </p>
        {selectedCategory && (
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-widest text-emerald-500"
            onClick={() => onSelectCategory?.(null)}
          >
            Clear drill-down
          </button>
        )}
      </div>
      <div
        className="mt-4 h-72"
        data-testid="category-chart-visual"
        onClick={handleContainerClick}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-emerald-400">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0
                  }).format(value)
                }
              />
              <Bar
                dataKey="revenue"
                fill="#10b981"
                cursor="pointer"
                onClick={(dataPoint: BarClickPayload) => {
                  const category = dataPoint?.payload?.category ?? dataPoint?.category;
                  if (typeof category === 'string' && category.length > 0) {
                    onSelectCategory?.(
                      category === selectedCategory ? null : category
                    );
                  }
                }}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.category}
                    data-category={entry.category}
                    fill={
                      entry.category === selectedCategory
                        ? '#047857'
                        : '#34d399'
                    }
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      onSelectCategory?.(
                        entry.category === selectedCategory
                          ? null
                          : entry.category
                      )
                    }
                    onMouseDown={() =>
                      onSelectCategory?.(
                        entry.category === selectedCategory
                          ? null
                          : entry.category
                      )
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
