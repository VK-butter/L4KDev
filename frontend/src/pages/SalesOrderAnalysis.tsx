import { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  analyticsApi,
  analyticsSummaryApi,
  analyticsStatusApi,
  type RawOrdersPage
} from '../services/analyticsApi';

type ApiErrorResponse = {
  response?: {
    data?: {
      error?: unknown;
    };
  };
};

type PieClickPayload = {
  name?: string;
};

function toIso(d: Date) { return d.toISOString().slice(0, 10); }

export function SalesOrderAnalysis() {
  const [dateStart, setDateStart] = useState<string>(''); // yyyy-mm-dd
  const [dateEnd, setDateEnd] = useState<string>(''); // yyyy-mm-dd
  const [data, setData] = useState<RawOrdersPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [summary, setSummary] = useState<{ totalRecords: number; totalRevenue?: number; totalQuantity?: number } | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<{ saled: number; cancel: number; total: number }>({ saled: 0, cancel: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  function handleStatusSelect(label: string) {
    const next = label === statusFilter ? undefined : label;
    setStatusFilter(next);
    setPage(1);
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [sum, st, res] = await Promise.all([
          analyticsSummaryApi.rawSummary({
            dateStart: dateStart || undefined,
            dateEnd: dateEnd || undefined
          }),
          analyticsStatusApi.rawStatus({
            dateStart: dateStart || undefined,
            dateEnd: dateEnd || undefined
          }),
          analyticsApi.rawOrders({
            page,
            pageSize,
            dateStart: dateStart || undefined,
            dateEnd: dateEnd || undefined,
            status: statusFilter || undefined,
            q: debouncedSearch || undefined
          })
        ]);
        if (!ignore) setSummary(sum.data.data);
        if (!ignore) {
          const rows = st.data.data.rows || [];
          const total = st.data.data.total || 0;
          const complete = rows
            .filter((r) => {
              const s = String(r.status).toLowerCase();
              return s === 'complete' || s === 'saled';
            })
            .reduce((a, b) => a + b.count, 0);
          const cancel = rows
            .filter((r) => String(r.status).toLowerCase() === 'cancel')
            .reduce((a, b) => a + b.count, 0);
          setStatusBreakdown({ saled: complete, cancel, total });
        }
        if (!ignore) setData(res.data.data);
      } catch (e) {
        if (!ignore) {
          const serverMsg = (e as ApiErrorResponse)?.response?.data?.error;
          const msg =
            typeof serverMsg === 'string'
              ? serverMsg
              : e instanceof Error
              ? e.message
              : 'Failed to load';
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
  }, [page, pageSize, dateStart, dateEnd, statusFilter, debouncedSearch]);

  function setDaily() {
    const d = new Date();
    const yesterday = new Date(d);
    yesterday.setDate(d.getDate() - 1);
    setDateStart(toIso(yesterday));
    setDateEnd(toIso(d));
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
    setStatusFilter(undefined);
    setPage(1);
  }

  // Server-side search via `q`; no client-side row filtering here.

  function downloadBlob(content: BlobPart, fileName: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function mapCellDisplay(column: string, value: unknown): string {
    const s = String(value ?? '');
    const n = s.trim().toLowerCase();
    if (n === 'saled') return 'Complete';
    return s;
  }

  async function exportAllToExcel() {
    // Export all filtered rows (not just current page)
    // Use max pageSize 500 for fewer requests
    const pageSize = 500;
    const start = dateStart || undefined;
    const end = dateEnd || undefined;

    // Ensure we have columns and total count
    let columns = data?.columns ?? [];
    let totalRecords = summary?.totalRecords;
    if (!totalRecords || totalRecords < 0) {
      try {
        const s = await analyticsSummaryApi.rawSummary({ dateStart: start, dateEnd: end });
        totalRecords = s.data.data.totalRecords;
      } catch {
        // fallback to at least current page
        totalRecords = data?.totalRecords ?? 0;
      }
    }

    if (!columns.length) {
      // fetch a small page to get columns
      const one = await analyticsApi.rawOrders({ page: 1, pageSize: 1, dateStart: start, dateEnd: end, status: statusFilter || undefined, q: debouncedSearch || undefined });
      columns = one.data.data.columns;
    }

    const totalPages = Math.max(Math.ceil((totalRecords ?? 0) / pageSize), 1);
    const header = columns.join(',');
    const allRows: string[] = [];

    for (let p = 1; p <= totalPages; p++) {
      const res = await analyticsApi.rawOrders({ page: p, pageSize, dateStart: start, dateEnd: end, status: statusFilter || undefined, q: debouncedSearch || undefined });
      const rows = res.data.data.rows.map((row) =>
        columns
          .map((c) => {
            const v = row[c];
            if (v === null || v === undefined) return '';
            const s = String(v);
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          })
          .join(',')
      );
      allRows.push(...rows);
    }

    const csv = [header, ...allRows].join('\n');
    const fnameStart = dateStart || 'all';
    const fnameEnd = dateEnd || 'all';
    const file = `sale_order_lines_${fnameStart}_to_${fnameEnd}_all.csv`;
    downloadBlob(csv, file, 'text/csv;charset=utf-8;');
  }

  return (
    <div className="flex flex-col gap-6" data-testid="sales-order-analysis">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-500">Dashboards</p>
          <h1 className="text-2xl font-semibold text-emerald-900">Sale order lines</h1>
        </div>
      </header>

      {/* Price Summary + Target (mock) – brighter UI, stays above */}
      <section className="grid gap-4 sm:grid-cols-1">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-emerald-600">รวมราคา (Price) Summary</p>
          {(() => {
            const priceTarget = 1_000_000; // mock
            const achieved = summary?.totalRevenue ?? 0;
            const pct = Math.max(0, Math.min(100, Math.round((achieved / priceTarget) * 100)));
            const delta = priceTarget - achieved;
            return (
              <>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className="text-emerald-700 text-sm">Achieved (฿)</p>
                    <p className="mt-1 text-3xl font-semibold text-emerald-900">
                      ฿ {achieved.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-700 text-sm">Target (฿)</p>
                    <p className="mt-1 text-3xl font-semibold text-emerald-900">฿ {priceTarget.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100" aria-label="Progress to price target">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-emerald-700">{pct}%</span>
                  <span className={delta > 0 ? 'text-red-600' : 'text-emerald-700'}>
                    {delta > 0 ? `Remaining: ฿ ${delta.toLocaleString()}` : `Exceeded by ฿ ${Math.abs(delta).toLocaleString()}`}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* Quantity Summary + Target (mock) – second */}
      <section className="grid gap-4 sm:grid-cols-1">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-emerald-600">Quantity Summary</p>
          {(() => {
            const qtyTarget = 80_000; // mock target quantity
            const q = summary?.totalQuantity;
            const achievedQty = typeof q === 'number' ? q : 0;
            const pct = Math.max(0, Math.min(100, Math.round(((achievedQty || 0) / qtyTarget) * 100)));
            const delta = qtyTarget - (achievedQty || 0);
            return (
              <>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className="text-emerald-700 text-sm">Achieved (qty)</p>
                    <p className="mt-1 text-3xl font-semibold text-emerald-900">
                      {typeof q === 'number' ? achievedQty.toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-700 text-sm">Target (qty)</p>
                    <p className="mt-1 text-3xl font-semibold text-emerald-900">{qtyTarget.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100" aria-label="Progress to qty target">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-emerald-700">{pct}%</span>
                  <span className={delta > 0 ? 'text-red-600' : 'text-emerald-700'}>
                    {delta > 0 ? `Remaining: ${delta.toLocaleString()}` : `Exceeded by ${Math.abs(delta).toLocaleString()}`}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* Status pie (Complete vs Cancel) with click-to-filter – third */}
      <section className="grid gap-4 sm:grid-cols-1">
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 text-emerald-900 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/30 to-teal-100/20 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-emerald-600">Status Breakdown</p>
              {statusFilter && (
                <button
                  type="button"
                  className="text-xs font-semibold uppercase tracking-widest text-emerald-500"
                  onClick={() => setStatusFilter(undefined)}
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Two-column layout: Pie left, Info right */}
            <div className="mt-2 grid gap-4 md:grid-cols-2 items-center">
              {/* Left: Donut Pie */}
              <div className="mx-auto w-full flex justify-center">
                {(() => {
                  const chartData = [
                    { name: 'Complete', value: statusBreakdown.saled, color: '#2563eb', grad: 'blue' },
                    { name: 'Cancel', value: statusBreakdown.cancel, color: '#dc2626', grad: 'red' }
                  ];
                  const total = Math.max(
                    statusBreakdown.total,
                    statusBreakdown.saled + statusBreakdown.cancel
                  );
                  return (
                    <div className="relative" data-testid="status-pie">
                      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-300/20 to-rose-300/20 blur-3xl rounded-full" />
                      <ResponsiveContainer width={240} height={220}>
                        <PieChart>
                          <defs>
                            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#60a5fa" />
                              <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                            <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f87171" />
                              <stop offset="100%" stopColor="#dc2626" />
                            </linearGradient>
                            <filter id="pieShadow">
                              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.25" />
                            </filter>
                          </defs>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={4}
                            dataKey="value"
                            onClick={(entry: PieClickPayload) => {
                              const label = entry?.name as string;
                              if (!label) return;
                              handleStatusSelect(label);
                            }}
                            style={{ cursor: 'pointer', filter: 'url(#pieShadow)' }}
                          >
                            {chartData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={entry.grad === 'blue' ? 'url(#blueGradient)' : 'url(#redGradient)'}
                                opacity={statusFilter == null || entry.name === statusFilter ? 1 : 0.35}
                                stroke={entry.name === statusFilter ? '#fff' : 'none'}
                                strokeWidth={entry.name === statusFilter ? 4 : 0}
                                onClick={() => handleStatusSelect(entry.name)}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              value.toLocaleString(),
                              name
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center total */}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-slate-500 text-xs">Total</p>
                          <p className="text-xl font-semibold text-slate-800">{total.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right: Info Cards */}
              <div className="grid gap-3">
                {(() => {
                  const total = Math.max(
                    statusBreakdown.total,
                    statusBreakdown.saled + statusBreakdown.cancel
                  );
                  const items = [
                    {
                      label: 'Complete',
                      key: 'Complete',
                      color: '#2563eb',
                      value: statusBreakdown.saled,
                      pct: total > 0 ? Math.round((statusBreakdown.saled / total) * 1000) / 10 : 0
                    },
                    {
                      label: 'Cancel',
                      key: 'Cancel',
                      color: '#dc2626',
                      value: statusBreakdown.cancel,
                      pct: total > 0 ? Math.round((statusBreakdown.cancel / total) * 1000) / 10 : 0
                    }
                  ];
                  return items.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => handleStatusSelect(it.label)}
                      className={`text-left rounded-xl border p-3 shadow-sm transition-colors ${
                        statusFilter === it.label
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-emerald-100 bg-white hover:bg-emerald-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: it.color }} />
                          <span className="font-semibold text-emerald-900">{it.label}:</span>
                        </div>
                        <span className="text-emerald-800">{it.value.toLocaleString()}</span>
                      </div>
                      <div className="mt-1 text-sm text-emerald-700">{it.pct}% of total</div>
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>

      
      {/* Filters – fourth */}
      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-500">Filters</p>
            <h3 className="text-lg font-semibold text-emerald-900">Date Range</h3>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-emerald-700">Start Date</label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
                lang="en-GB"
                className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-emerald-700">End Date</label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
                lang="en-GB"
                className="rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <button type="button" onClick={setDaily} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400">Daily</button>
              <button type="button" onClick={setYTD} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400">YTD</button>
              <button type="button" onClick={clearDates} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-400">All</button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-500">Table</p>
            <h3 className="text-lg font-semibold text-emerald-900">Raw Orders</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exportAllToExcel}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:border-emerald-400"
              title="Export all filtered rows to Excel"
            >
              {/* Simple Excel-like icon (SVG) */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <circle cx="12" cy="12" r="11" fill="#1f9d55" />
                <rect x="7" y="6" width="10" height="12" rx="1.5" fill="#ffffff" />
                <path d="M9.5 9.5L12 12l-2.5 2.5M14.5 9.5L12 12l2.5 2.5" stroke="#1f9d55" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Export</span>
            </button>
            <div>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search rows..."
                className="w-56 rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
        </header>

        {loading && <p className="text-emerald-500">Loading…</p>}
        {error && <p className="text-rose-600">{error}</p>}
        {!loading && !error && data && (
          <div className="overflow-auto max-h-96 rounded border border-emerald-100">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-emerald-50 border-b border-emerald-200 px-2 py-1 text-left text-emerald-800 w-12">#</th>
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
                    <td className="px-2 py-2 whitespace-nowrap text-emerald-700">{(((data.page - 1) * data.pageSize) + i + 1).toLocaleString()}</td>
                    {data.columns.map((c) => (
                      <td key={c} className="px-2 py-2 whitespace-nowrap text-emerald-900">
                        {mapCellDisplay(c, row[c])}
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
                Showing {(((data.page - 1) * data.pageSize) + 1).toLocaleString()}–{Math.min(data.page * data.pageSize, data.totalRecords).toLocaleString()} of {data.totalRecords.toLocaleString()}
              </span>
            ) : (
              <span>\u00A0</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-emerald-700">Per page</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded border border-emerald-200 px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button
              type="button"
              disabled={loading || (data?.page ?? 1) <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="rounded border border-emerald-200 px-3 py-1 disabled:opacity-50"
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
