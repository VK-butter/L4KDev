import type { AnalyticsTimeseriesPoint } from '@shared/index';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { NoDataState } from './NoDataState';
import { brandPalette, chartPalette } from '../../theme/tokens';

interface Props {
  data: AnalyticsTimeseriesPoint[];
  loading: boolean;
}

export function RevenueTrendChart({ data, loading }: Props) {
  if (!loading && data.length === 0) {
    return <NoDataState message="No trend data for selected filters." />;
  }

  return (
    <div className="panel flex flex-col gap-4" data-testid="trend-chart">
      <div>
        <p className="section-heading">Trend</p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-emerald-100">
          Revenue Over Time
        </h3>
      </div>

      <div className="h-64">
        {loading ? (
          <div className="skeleton h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brandPalette.accent[300]} stopOpacity={0.34} />
                  <stop offset="45%" stopColor={brandPalette.brand[400]} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={brandPalette.brand[400]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} vertical={false} />
              <XAxis
                dataKey="date"
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
                formatter={(v: number) => [
                  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v),
                  'Revenue'
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={brandPalette.accent[500]}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 5, fill: brandPalette.brand[700], strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
