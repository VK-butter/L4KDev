import { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  analyticsApi,
  analyticsSummaryApi,
  analyticsStatusApi,
  analyticsSalesTargetApi,
  type RawOrdersPage,
  type SalesTargetCompareResponse
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

function fmtRev(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/* ── Animated number counter ────────────────────── */
function AnimatedNum({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 600;
    const start = performance.now();
    const from = display;
    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * ease));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

/* ── SVG Icons ──────────────────────────────────── */
const RevenueIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const QtyIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>;
const OrdersIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;
const TargetIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;

/* ── KPI metric mini-card ───────────────────────── */
function MetricBox({ label, value, displayValue, icon, color, hint }: {
  label: string; value?: number; displayValue?: string; icon: React.ReactNode; color: string; hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 hover:scale-[1.02]
      border-emerald-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-emerald-500">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
          {displayValue != null ? displayValue : (value != null ? <AnimatedNum value={value} /> : '—')}
        </p>
        {hint && (
          <p className="mt-0.5 text-[10px] text-gray-500 dark:text-emerald-500">{hint}</p>
        )}
      </div>
    </div>
  );
}

export function SalesOrderAnalysis() {
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
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
  const [targetData, setTargetData] = useState<SalesTargetCompareResponse | null>(null);
  const fallbackTargetStart = toIso(new Date(new Date().getFullYear(), 0, 1));
  const fallbackTargetEnd = toIso(new Date());
  const effectiveTargetStart = dateStart || fallbackTargetStart;
  const effectiveTargetEnd = dateEnd || fallbackTargetEnd;

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
        const [sum, st, res, tgt] = await Promise.all([
          analyticsSummaryApi.rawSummary({
            dateStart: dateStart || undefined,
            dateEnd: dateEnd || undefined,
            status: statusFilter || undefined
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
          }),
          analyticsSalesTargetApi.compareSalesTarget({
            dateStart: effectiveTargetStart,
            dateEnd: effectiveTargetEnd,
            statuses: statusFilter ? [statusFilter] : [],
            channels: [],
            categories: []
          }).catch(() => null)
        ]);
        if (!ignore) setSummary(sum.data.data);
        if (!ignore && tgt) setTargetData(tgt.data.data);
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

  function mapCellDisplay(_column: string, value: unknown): string {
    const s = String(value ?? '');
    const n = s.trim().toLowerCase();
    if (n === 'saled') return 'Complete';
    return s;
  }

  async function exportAllToExcel() {
    const pageSize = 500;
    const start = dateStart || undefined;
    const end = dateEnd || undefined;

    let columns = data?.columns ?? [];
    let totalRecords = summary?.totalRecords;
    if (!totalRecords || totalRecords < 0) {
      try {
        const s = await analyticsSummaryApi.rawSummary({ dateStart: start, dateEnd: end, status: statusFilter || undefined });
        totalRecords = s.data.data.totalRecords;
      } catch {
        totalRecords = data?.totalRecords ?? 0;
      }
    }

    if (!columns.length) {
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

  const priceTarget = targetData?.kpi.targetRevenue ?? 0;
  const achieved = targetData?.kpi.actualRevenue ?? summary?.totalRevenue ?? 0;
  const pricePct = priceTarget > 0 ? Math.max(0, Math.min(100, Math.round((achieved / priceTarget) * 100))) : 0;
  const priceDelta = priceTarget - achieved;
  const achievementPct = targetData?.kpi.achievementPct;

  const achievedQty = typeof summary?.totalQuantity === 'number' ? summary.totalQuantity : 0;

  const statusTotal = Math.max(statusBreakdown.total, statusBreakdown.saled + statusBreakdown.cancel);

  return (
    <div className="flex flex-col gap-5" data-testid="sales-order-analysis">
      {/* ── Header ──────────────────────────────── */}
      <header>
        <p className="section-heading">Dashboards</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ภาพรวมยอดขาย</h1>
        <p className="text-sm text-gray-500 dark:text-emerald-400">
          สรุปยอดขาย สถานะ และตัวกรองช่วงเวลา
        </p>
      </header>

      {/* ── KPI Cards ────────────────────────────── */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricBox label="ยอดขายจริง" displayValue={`฿${fmtRev(achieved)}`} icon={RevenueIcon}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300" />
        <MetricBox
          label="เป้ายอดขาย"
          displayValue={priceTarget > 0 ? `฿${fmtRev(priceTarget)}` : '—'}
          icon={TargetIcon}
          hint={`Target range: ${effectiveTargetStart} to ${effectiveTargetEnd}`}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300"
        />
        <MetricBox label="จำนวน (Qty)" value={achievedQty} icon={QtyIcon}
          color="bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300" />
        <MetricBox label="% Achievement" displayValue={achievementPct != null ? `${achievementPct.toFixed(1)}%` : '—'} icon={OrdersIcon}
          color={achievementPct != null && achievementPct >= 100
            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300'
            : 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300'} />
      </section>

      {/* ── Revenue vs Target Progress ───────────── */}
      {priceTarget > 0 && (
        <section className="panel">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-emerald-500">ยอดขายจริง vs เป้ายอดขาย</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-emerald-500">
            Target range: {effectiveTargetStart} to {effectiveTargetEnd} (monthly target)
          </p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">฿{achieved.toLocaleString()}</p>
            <p className="text-sm text-gray-400 dark:text-emerald-500">/ ฿{priceTarget.toLocaleString()}</p>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <div className={`h-full rounded-full transition-all ${priceDelta > 0 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-emerald-500 dark:bg-emerald-400'}`}
              style={{ width: `${Math.min(pricePct, 100)}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600 dark:text-emerald-300">{pricePct}%</span>
            <span className={priceDelta > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-300'}>
              {priceDelta > 0 ? `ขาดอีก: ฿${priceDelta.toLocaleString()}` : `เกินเป้า: ฿${Math.abs(priceDelta).toLocaleString()}`}
            </span>
          </div>
        </section>
      )}

      {/* ── Status Breakdown ─────────────────────── */}
      <section className="panel">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Status Breakdown</h3>
          {statusFilter && (
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-widest text-emerald-500 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
              onClick={() => setStatusFilter(undefined)}
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 items-center">
          {/* Donut Pie */}
          <div className="mx-auto w-full flex justify-center">
            {(() => {
              const chartData = [
                { name: 'Complete', value: statusBreakdown.saled, color: '#2563eb', grad: 'blue' },
                { name: 'Cancel', value: statusBreakdown.cancel, color: '#dc2626', grad: 'red' }
              ];
              return (
                <div className="relative" data-testid="status-pie">
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
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 dark:text-emerald-500">Total</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{statusTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Info Cards */}
          <div className="grid gap-3">
            {[
              {
                label: 'Complete',
                key: 'Complete',
                color: '#2563eb',
                value: statusBreakdown.saled,
                pct: statusTotal > 0 ? Math.round((statusBreakdown.saled / statusTotal) * 1000) / 10 : 0
              },
              {
                label: 'Cancel',
                key: 'Cancel',
                color: '#dc2626',
                value: statusBreakdown.cancel,
                pct: statusTotal > 0 ? Math.round((statusBreakdown.cancel / statusTotal) * 1000) / 10 : 0
              }
            ].map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => handleStatusSelect(it.label)}
                className={`text-left rounded-xl border p-3 transition-all duration-150 ${
                  statusFilter === it.label
                    ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/40'
                    : 'border-emerald-100 bg-white hover:bg-emerald-50 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: it.color }} />
                    <span className="font-semibold text-gray-900 dark:text-white">{it.label}</span>
                  </div>
                  <span className="font-bold text-gray-700 dark:text-white tabular-nums">{it.value.toLocaleString()}</span>
                </div>
                <div className="mt-1 text-xs text-gray-400 dark:text-emerald-500">{it.pct}% of total</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Filters ──────────────────────────────── */}
      <section className="panel border-l-4 border-emerald-400 dark:border-emerald-600 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Filters</h3>
          <div className="ml-auto flex gap-1">
            {[
              { key: 'daily', fn: setDaily },
              { key: 'ytd', fn: setYTD },
              { key: 'all', fn: clearDates }
            ].map((p) => (
              <button key={p.key} type="button" onClick={p.fn}
                className="rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-300 transition-all duration-150">
                {p.key}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={dateStart}
            onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
            className="input py-1.5 text-xs"
          />
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
            className="input py-1.5 text-xs"
          />
        </div>
      </section>

      {/* ── Raw Orders Table ─────────────────────── */}
      <section className="panel">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-emerald-500">Table</p>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Raw Orders</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exportAllToExcel}
              className="btn-sm btn-outline"
              title="Export all filtered rows to CSV"
            >
              Export
            </button>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search rows..."
              className="input w-56"
            />
          </div>
        </header>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-9 w-full" />)}
          </div>
        )}
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        {!loading && !error && data && (
          <div className="overflow-auto max-h-[32rem] rounded-xl border border-emerald-100 dark:border-white/[0.06]">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  {data.columns.map((c) => <th key={c}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="text-gray-400 dark:text-emerald-600 tabular-nums">
                      {(((data.page - 1) * data.pageSize) + i + 1).toLocaleString()}
                    </td>
                    {data.columns.map((c) => (
                      <td key={c} className="whitespace-nowrap">{mapCellDisplay(c, row[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-emerald-400">
          <div>
            {data && data.totalRecords > 0 ? (
              <span>
                Showing {(((data.page - 1) * data.pageSize) + 1).toLocaleString()}–{Math.min(data.page * data.pageSize, data.totalRecords).toLocaleString()} of {data.totalRecords.toLocaleString()}
              </span>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-500 dark:text-emerald-400">Per page</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="input w-auto py-1.5 px-2"
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
              className="btn-sm btn-outline disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-gray-600 dark:text-emerald-300">
              Page {data?.page ?? page} / {data?.totalPages ?? '-'}
            </span>
            <button
              type="button"
              disabled={loading || (data?.page ?? 1) >= (data?.totalPages ?? 1)}
              onClick={() => setPage((p) => (data ? Math.min(p + 1, data.totalPages) : p + 1))}
              className="btn-sm btn-outline disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

