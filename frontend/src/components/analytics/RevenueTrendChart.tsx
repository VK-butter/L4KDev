import type { AnalyticsTimeseriesPoint } from '@shared/index';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { NoDataState } from './NoDataState';

interface Props {
  data: AnalyticsTimeseriesPoint[];
  loading: boolean;
}

export function RevenueTrendChart({ data, loading }: Props) {
  if (!loading && data.length === 0) {
    return <NoDataState message="No trend data for selected filters." />;
  }

  return (
    <div
      className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
      data-testid="trend-chart"
    >
      <p className="text-sm font-semibold text-emerald-900">
        Revenue Trend
      </p>
      <div className="mt-4 h-72">
        {loading ? (
          <div className="flex h-full items-center justify-center text-emerald-400">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#059669"
                fillOpacity={1}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
