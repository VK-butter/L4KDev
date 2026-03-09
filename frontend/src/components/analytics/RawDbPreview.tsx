import { useEffect, useState } from 'react';
import { analyticsApi, type RawOrdersPage } from '../../services/analyticsApi';

export function RawDbPreview() {
  const [data, setData] = useState<RawOrdersPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await analyticsApi.rawOrders({ page, pageSize: 25 });
        if (!ignore) setData(res.data.data);
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [page]);

  return (
    <section className="panel">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-heading">Live Database</p>
          <h3 className="text-base font-semibold text-gray-900 dark:text-emerald-100">
            joinsales_orderline
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || (data?.page ?? 1) <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="btn-sm btn-outline disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prev
          </button>
          <span className="text-xs text-gray-500 dark:text-emerald-500">
            {data?.page ?? page} / {data?.totalPages ?? '—'}
          </span>
          <button
            type="button"
            disabled={loading || (data?.page ?? 1) >= (data?.totalPages ?? 1)}
            onClick={() => setPage((p) => (data ? Math.min(p + 1, data.totalPages) : p + 1))}
            className="btn-sm btn-outline disabled:opacity-40"
          >
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </header>

      {loading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-9 w-full" />)}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}
      {!loading && !error && data && (
        <div className="overflow-auto rounded-xl border border-emerald-100 dark:border-white/[0.06]">
          <table className="tbl">
            <thead>
              <tr>
                {data.columns.map((c) => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i}>
                  {data.columns.map((c) => (
                    <td key={c} className="whitespace-nowrap">{String(row[c] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
