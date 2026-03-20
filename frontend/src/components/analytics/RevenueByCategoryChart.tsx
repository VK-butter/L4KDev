import type { AnalyticsCategoryBreakdown } from '@shared/index';
import {
  Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { NoDataState } from './NoDataState';
import { useCallback } from 'react';
import { chartPalette } from '../../theme/tokens';

type BarClickPayload = {
  payload?: { category?: string };
  category?: string;
};

interface Props {
  data: AnalyticsCategoryBreakdown[];
  loading: boolean;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function RevenueByCategoryChart({ data, loading, selectedCategory, onSelectCategory }: Props) {
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
      className="panel flex flex-col gap-4"
      data-testid="category-chart"
      role="region"
      aria-label="Revenue by Category chart"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="section-heading">Analytics</p>
          <h3 className="text-base font-semibold text-gray-900 dark:text-emerald-100">
            Revenue by Category
          </h3>
        </div>
        {selectedCategory && (
          <button
            type="button"
            className="btn-sm btn-ghost text-xs"
            onClick={() => onSelectCategory?.(null)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear
          </button>
        )}
      </div>

      <div
        className="h-64"
        data-testid="category-chart-visual"
        onClick={handleContainerClick}
      >
        {loading ? (
          <div className="flex h-full flex-col gap-3 justify-end pb-2">
            {[60, 90, 45, 75, 55, 80].map((h, i) => (
              <div key={i} className="skeleton" style={{ height: `${h}%` }} />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: chartPalette.axis }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: chartPalette.axis }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: `1px solid ${chartPalette.tooltipBorder}`,
                  boxShadow: '0 10px 25px -10px rgba(0,0,0,0.15)',
                  fontSize: '13px',
                  backgroundColor: 'var(--app-surface)',
                  color: 'var(--app-text)'
                }}
                formatter={(value: number) => [fmt.format(value), 'Revenue']}
              />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]} cursor="pointer"
                onClick={(dataPoint: BarClickPayload) => {
                  const category = dataPoint?.payload?.category ?? dataPoint?.category;
                  if (typeof category === 'string' && category.length > 0) {
                    onSelectCategory?.(category === selectedCategory ? null : category);
                  }
                }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.category}
                    data-category={entry.category}
                    fill={entry.category === selectedCategory ? '#0f7f48' : chartPalette.categorical[index % chartPalette.categorical.length]}
                    opacity={selectedCategory && entry.category !== selectedCategory ? 0.45 : 1}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectCategory?.(entry.category === selectedCategory ? null : entry.category)}
                    onMouseDown={() => onSelectCategory?.(entry.category === selectedCategory ? null : entry.category)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {selectedCategory && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Filtered to: <strong>{selectedCategory}</strong>
        </p>
      )}
    </div>
  );
}
