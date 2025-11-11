import { useEffect, useState } from 'react';
import type { EmbeddingTarget } from '@shared/index';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { embedApi } from '../../services/embedApi';

interface Props {
  target: EmbeddingTarget;
}

export function NocoDbPlaceholder({ target }: Props) {
  const [data, setData] = useState<Array<{ week: string; orders: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await embedApi.nocodbPlaceholder();
      setData(response.data.values);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load placeholder data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        await fetchData();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full w-full rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <header className="border-b border-emerald-50 px-6 py-4">
        <h3 className="text-lg font-semibold text-emerald-900">
          {target.title}
        </h3>
        <p className="text-sm text-emerald-600">{target.description}</p>
      </header>
      <div className="p-6">
        <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-700">
          <p className="font-semibold">Integration notes</p>
          <p>{target.integrationNotes}</p>
        </div>
        <div className="mt-4 h-80">
          {loading && (
            <div className="flex h-full items-center justify-center text-emerald-400" role="status" aria-live="polite">
              Loading…
            </div>
          )}
          {error && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-red-500" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="rounded-full border border-red-200 px-4 py-1 text-sm text-red-600 hover:border-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#10b981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
