import { useEffect, useMemo, useState } from 'react';
import { DatePicker } from '../components/common/DatePicker';
import { analyticsApi } from '../services/analyticsApi';

interface RawDataPage {
  columns: string[];
  rows: any[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

function toIso(d: Date) { return d.toISOString().slice(0, 10); }

export function SalesOrderAnalysis() {
  const [dateStart, setDateStart] = useState<string>(''); // yyyy-mm-dd
  const [dateEnd, setDateEnd] = useState<string>(''); // yyyy-mm-dd
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
        const res = await analyticsApi.rawOrders({
          page,
          pageSize: 50,
          dateStart: dateStart || undefined,
          dateEnd: dateEnd || undefined
        });
        if (!ignore) setData(res.data.data);
      } catch (e) {
        if (!ignore) {
          const anyErr = e as any;
          const serverMsg = anyErr?.response?.data?.error;
          const msg = typeof serverMsg === 'string' ? serverMsg : (e instanceof Error ? e.message : 'Failed to load');
          setError(msg);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [page, dateStart, dateEnd]);

  function setDaily() {
    const d = new Date();
    const iso = toIso(d);
    setDateStart(iso);
    setDateEnd(iso);
    setPage(1);
  }

  function setYTD() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    setDateStart(toIso(start));
    setDateEnd(toIso(d));
    setPage(1);
  }

  function clearDates() {
    setDateStart('');
    setDateEnd('');
    setPage(1);
  }

  const fromIdx = useMemo(() => (data ? (data.page - 1) * data.pageSize + 1 : 0), [data]);
  const toIdx = useMemo(
    () => (data ? Math.min(data.page * data.pageSize, data.totalRecords) : 0),
    [data]
  );

  return (
    <div className="flex flex-col gap-6" data-testid="sales-order-analysis">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-500">Dashboards</p>
          <h1 className="text-2xl font-semibold text-emerald-900">Sales Order Analysis</h1>
        </div>
        <div className="flex items-end gap-3">
<<<<<<< ours
          <DatePicker label="Start Date" valueISO={dateStart} onChangeISO={(iso) => { setDateStart(iso); setPage(1); }} />
          <DatePicker label="End Date" valueISO={dateEnd} onChangeISO={(iso) => { setDateEnd(iso); setPage(1); }} />
=======
          <div className="space-y-1">
            <label className="block text-xs font-medium text-emerald-700">Start Date</label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-emerald-700">End Date</label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
>>>>>>> theirs
          <div className="flex items-center gap-2 pb-1">
            <button type="button" onClick={setDaily} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400">Daily</button>
            <button type="button" onClick={setYTD} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400">YTD</button>
            <button type="button" onClick={clearDates} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400">All</button>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-500">Table</p>
            <h3 className="text-lg font-semibold text-emerald-900">Raw Orders</h3>
          </div>
          <div className="text-sm text-emerald-700">
            {data ? `Total rows: ${data.totalRecords.toLocaleString()}` : '\u00A0'}
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

        <footer className="mt-3 flex items-center justify-between text-sm text-emerald-700">
          <div>
            {data && data.totalRecords > 0 ? (
              <span>
                Showing {fromIdx.toLocaleString()}–{toIdx.toLocaleString()} of {data.totalRecords.toLocaleString()}
              </span>
            ) : (
              <span>\u00A0</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || (data?.page ?? 1) <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="rounded border border-emerald-200 px-3 py-1 disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {data?.page ?? page} / {data?.totalPages ?? '-'} (50 per page)
            </span>
            <button
              type="button"
              disabled={loading || (data?.page ?? 1) >= (data?.totalPages ?? 1)}
              onClick={() => setPage((p) => (data ? Math.min(p + 1, data.totalPages) : p + 1))}
              className="rounded border border-emerald-200 px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
