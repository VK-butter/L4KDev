import { useEffect, useState } from 'react';
import { analyticsApi } from '../../services/analyticsApi';

interface RawDataPage {
  columns: string[];
  rows: any[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export function RawDbPreview() {
  const [data, setData] = useState<RawDataPage | null>(null);
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
    return () => {
      ignore = true;
    };
  }, [page]);

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-500">DB Preview</p>
          <h3 className="text-xl font-semibold text-emerald-900">l4k_model.joinsales_orderline</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <button
            type="button"
            disabled={loading || (data?.page ?? 1) <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="rounded border border-emerald-200 px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {data?.page ?? page} / {data?.totalPages ?? '-'}
          </span>
          <button
            type="button"
            disabled={loading || (data?.page ?? 1) >= (data?.totalPages ?? 1)}
            onClick={() => setPage((p) => (data ? Math.min(p + 1, data.totalPages) : p + 1))}
            className="rounded border border-emerald-200 px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </header>
      {loading && <p className="text-emerald-500">Loading…</p>}
      {error && <p className="text-rose-600">{error}</p>}
      {!loading && !error && data && (
        <div className="overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                {data.columns.map((c) => (
                  <th key={c} className="sticky top-0 bg-emerald-50 border-b border-emerald-200 px-2 py-1 text-left text-emerald-800">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="border-b border-emerald-50">
                  {data.columns.map((c) => (
                    <td key={c} className="px-2 py-1 text-emerald-900">
                      {String(row[c] ?? '')}
                    </td>
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
