import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  skuApi,
  type MonthComparisonItem,
  type SkuRawPage,
  type SkuPeriod
} from '../services/skuApi';
import { downloadCsv } from '../utils/downloadCsv';

type ApiError = { response?: { data?: { error?: unknown } } };

function normalizeError(err: unknown) {
  const server = (err as ApiError)?.response?.data?.error;
  if (typeof server === 'string') return server;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

/* ── SVG Icons ──────────────────────────────────── */
const QtyIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>;
const AmountIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;

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

/* ── KPI metric mini-card ───────────────────────── */
function MetricBox({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 hover:scale-[1.02]
      border-emerald-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-emerald-500">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
          <AnimatedNum value={value} />
        </p>
      </div>
    </div>
  );
}

type SkuTableProps = {
  title: string;
  caption: string;
  data: SkuRawPage | null;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onExport?: () => void;
};

function SkuRawTable({
  title,
  caption,
  data,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onExport
}: SkuTableProps) {
  return (
    <section className="panel">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-emerald-500">{caption}</p>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            disabled={loading}
            className="btn-sm btn-outline disabled:opacity-40"
            title="Export all filtered rows to CSV"
          >
            Export
          </button>
        )}
      </header>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-9 w-full" />)}
        </div>
      )}
      {!loading && data && data.rows.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400 dark:text-emerald-600">No rows found for this dataset.</p>
      )}
      {!loading && data && data.rows.length > 0 && (
        <>
          <div className="overflow-auto max-h-96 rounded-xl border border-emerald-100 dark:border-white/[0.06]">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  {data.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="text-gray-400 dark:text-emerald-600 tabular-nums">
                      {(((data.page - 1) * data.pageSize) + i + 1).toLocaleString()}
                    </td>
                    {data.columns.map((c) => (
                      <td key={c} className="whitespace-nowrap">
                        {String((row as Record<string, unknown>)[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-emerald-400">
            <div>
              {data.totalRecords > 0 ? (
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
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
                onClick={() => onPageChange(Math.max(page - 1, 1))}
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
                onClick={() => onPageChange(data ? Math.min(page + 1, data.totalPages) : page + 1)}
                className="btn-sm btn-outline disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}

export function ProductSkuDashboard() {
  const [chartData, setChartData] = useState<MonthComparisonItem[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'qty' | 'amount'>('qty');
  const [amountTotals, setAmountTotals] = useState<{ currentAmount: number; previousAmount: number } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [previousPage, setPreviousPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(20);
  const [previousPageSize, setPreviousPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [currentData, setCurrentData] = useState<SkuRawPage | null>(null);
  const [previousData, setPreviousData] = useState<SkuRawPage | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let ignore = false;
    async function loadChart() {
      setChartLoading(true);
      setChartError(null);
      try {
        const res = await skuApi.getMonthlyComparison();
        if (!ignore) {
          setChartData(res.data.data.months);
          setAmountTotals(res.data.data.amountTotals ?? null);
        }
      } catch (err) {
        if (!ignore) setChartError(normalizeError(err));
      } finally {
        if (!ignore) setChartLoading(false);
      }
    }
    loadChart();
    return () => {
      ignore = true;
    };
  }, []);

  async function loadRaw(period: SkuPeriod, page: number, pageSize: number) {
    const res = await skuApi.getRaw(period, {
      page,
      pageSize,
      q: debouncedSearch || undefined
    });
    return res.data.data;
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      setTableLoading(true);
      setTableError(null);
      try {
        const [current, previous] = await Promise.all([
          loadRaw('current', currentPage, currentPageSize),
          loadRaw('previous', previousPage, previousPageSize)
        ]);
        if (!ignore) {
          setCurrentData(current);
          setPreviousData(previous);
        }
      } catch (err) {
        if (!ignore) setTableError(normalizeError(err));
      } finally {
        if (!ignore) setTableLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [currentPage, previousPage, currentPageSize, previousPageSize, debouncedSearch]);

  const currentTotal = useMemo(
    () => chartData.reduce((sum, m) => sum + (m.currentQty || 0), 0),
    [chartData]
  );
  const previousTotal = useMemo(
    () => chartData.reduce((sum, m) => sum + (m.previousQty || 0), 0),
    [chartData]
  );
  const currentAmountTotal = useMemo(
    () =>
      amountTotals?.currentAmount ??
      chartData.reduce((sum, m) => sum + (m.currentAmount || 0), 0),
    [chartData, amountTotals]
  );
  const previousAmountTotal = useMemo(
    () =>
      amountTotals?.previousAmount ??
      chartData.reduce((sum, m) => sum + (m.previousAmount || 0), 0),
    [chartData, amountTotals]
  );

  async function exportAll(period: SkuPeriod) {
    const first = await skuApi.getRaw(period, {
      page: 1,
      pageSize: 1,
      q: debouncedSearch || undefined
    });
    const totalRecords = first.data.data.totalRecords;
    const columns = first.data.data.columns;
    const pageSize = 500;
    const totalPages = Math.max(Math.ceil(totalRecords / pageSize), 1);
    const rows: string[] = [];
    for (let page = 1; page <= totalPages; page++) {
      const res = await skuApi.getRaw(period, {
        page,
        pageSize,
        q: debouncedSearch || undefined
      });
      const chunk = res.data.data.rows.map((row) =>
        columns
          .map((c) => {
            const v = (row as Record<string, unknown>)[c];
            if (v === null || v === undefined) return '';
            const s = String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      );
      rows.push(...chunk);
    }
    const csv = [columns.join(','), ...rows].join('\n');
    const label = period === 'current' ? 'current' : 'previous';
    const fileName = `sku_${label}_export.csv`;
    downloadCsv(csv, fileName);
  }

  return (
    <div className="flex flex-col gap-5" data-testid="product-sku-dashboard">
      {/* ── Header ──────────────────────────────── */}
      <header>
        <p className="section-heading">Dashboards</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product SKU</h1>
        <p className="text-sm text-gray-500 dark:text-emerald-400">
          เปรียบเทียบจำนวน SKU ปีปัจจุบันกับปีก่อนหน้า
        </p>
      </header>

      {/* ── KPI Cards ────────────────────────────── */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricBox label="Current Qty" value={currentTotal} icon={QtyIcon}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300" />
        <MetricBox label="Previous Qty" value={previousTotal} icon={QtyIcon}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" />
        <MetricBox label="Current Amount" value={currentAmountTotal} icon={AmountIcon}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300" />
        <MetricBox label="Previous Amount" value={previousAmountTotal} icon={AmountIcon}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" />
      </section>

      {/* ── Chart ────────────────────────────────── */}
      <section className="panel">
        <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Monthly Trend</h3>
          <div className="flex gap-1">
            {(['qty', 'amount'] as const).map((m) => {
              const isActive = chartMetric === m;
              return (
                <button key={m} type="button" onClick={() => setChartMetric(m)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all duration-150
                    ${isActive
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-300'
                    }`}>
                  {m === 'qty' ? 'จำนวน (Qty)' : 'ยอดรวม (Price)'}
                </button>
              );
            })}
          </div>
        </div>

        {chartLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-9 w-full" />)}
          </div>
        )}
        {chartError && <p className="text-sm text-rose-600 dark:text-rose-400">{chartError}</p>}
        {!chartLoading && !chartError && chartData.length === 0 && !amountTotals && (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-emerald-200 dark:border-white/10">
            <p className="text-sm text-gray-400 dark:text-emerald-600">No monthly totals detected in the SKU tables.</p>
          </div>
        )}
        {!chartLoading && !chartError && (chartData.length > 0 || amountTotals) && (
          chartMetric === 'amount' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border px-4 py-4 border-emerald-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300">
                  {AmountIcon}
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-emerald-500">ยอดรวมปีปัจจุบัน</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {currentAmountTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-emerald-600">SKU_dataCurrent</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border px-4 py-4 border-emerald-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                  {AmountIcon}
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-emerald-500">ยอดรวมปีก่อน</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {previousAmountTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-emerald-600">SKU_dataPrevious</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 8, right: 16 }}>
                  <defs>
                    <linearGradient id="currentFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="previousFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(16,185,129,0.08)" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)', fontSize: 13 }}
                    formatter={(value: number) => [value.toLocaleString()]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="currentQty"
                    name="Current year qty"
                    stroke="#059669"
                    fill="url(#currentFill)"
                    strokeWidth={2}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="previousQty"
                    name="Previous year qty"
                    stroke="#2563eb"
                    fill="url(#previousFill)"
                    strokeWidth={2}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )
        )}
      </section>

      {/* ── Search / Filter ──────────────────────── */}
      <section className="panel border-l-4 border-emerald-400 dark:border-emerald-600">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Search</h3>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
              setPreviousPage(1);
            }}
            placeholder="Search SKU, product, description…"
            className="input w-64"
          />
        </div>
        {tableError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{tableError}</p>}
      </section>

      {/* ── Data Tables ──────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SkuRawTable
          title="Current year (SKU_dataCurrent)"
          caption="Raw table preview"
          data={currentData}
          loading={tableLoading}
          page={currentPage}
          pageSize={currentPageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setCurrentPageSize(size);
            setCurrentPage(1);
          }}
          onExport={() => exportAll('current')}
        />
        <SkuRawTable
          title="Previous year (SKU_dataPrevious)"
          caption="Raw table preview"
          data={previousData}
          loading={tableLoading}
          page={previousPage}
          pageSize={previousPageSize}
          onPageChange={setPreviousPage}
          onPageSizeChange={(size) => {
            setPreviousPageSize(size);
            setPreviousPage(1);
          }}
          onExport={() => exportAll('previous')}
        />
      </div>
    </div>
  );
}
