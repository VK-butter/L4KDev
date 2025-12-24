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
          <p className="text-xs uppercase tracking-widest text-emerald-500">{caption}</p>
          <h3 className="text-lg font-semibold text-emerald-900">{title}</h3>
        </div>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:border-emerald-400 disabled:opacity-60"
            title="Export all filtered rows to Excel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <circle cx="12" cy="12" r="11" fill="#1f9d55" />
              <rect x="7" y="6" width="10" height="12" rx="1.5" fill="#ffffff" />
              <path d="M9.5 9.5L12 12l-2.5 2.5M14.5 9.5L12 12l2.5 2.5" stroke="#1f9d55" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Export</span>
          </button>
        )}
      </header>
      {loading && <p className="text-emerald-500">Loading…</p>}
      {!loading && data && data.rows.length === 0 && (
        <p className="text-emerald-700">No rows found for this dataset.</p>
      )}
      {!loading && data && data.rows.length > 0 && (
        <>
          <div className="overflow-auto max-h-96 rounded border border-emerald-100">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-emerald-50 border-b border-emerald-200 px-2 py-1 text-left text-emerald-800 w-12">
                    #
                  </th>
                  {data.columns.map((c) => (
                    <th
                      key={c}
                      className="sticky top-0 bg-emerald-50 border-b border-emerald-200 px-2 py-1 text-left text-emerald-800"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-b border-emerald-50">
                    <td className="px-2 py-2 whitespace-nowrap text-emerald-700">
                      {(((data.page - 1) * data.pageSize) + i + 1).toLocaleString()}
                    </td>
                    {data.columns.map((c) => (
                      <td key={c} className="px-2 py-2 whitespace-nowrap text-emerald-900">
                        {String((row as Record<string, unknown>)[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="mt-3 flex items-center justify-between text-sm text-emerald-700">
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
              <label className="text-emerald-700">Per page</label>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
                onClick={() => onPageChange(Math.max(page - 1, 1))}
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
                onClick={() => onPageChange(data ? Math.min(page + 1, data.totalPages) : page + 1)}
                className="rounded border border-emerald-200 px-3 py-1 disabled:opacity-50"
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
    <div className="flex flex-col gap-6" data-testid="product-sku-dashboard">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-500">Dashboards</p>
          <h1 className="text-2xl font-semibold text-emerald-900">Product SKU</h1>
          <p className="text-sm text-emerald-700">
            Current vs previous year SKU quantities sourced from l4k_model tables.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-500">Monthly trend</p>
            <h3 className="text-lg font-semibold text-emerald-900">Current vs Previous Year</h3>
          </div>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setChartMetric('qty')}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                chartMetric === 'qty'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400'
              }`}
            >
              จำนวน (Qty)
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('amount')}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                chartMetric === 'amount'
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400'
              }`}
            >
              ยอดรวม (Price)
            </button>
          </div>
          {chartMetric === 'qty' && (
            <div className="flex gap-3 text-sm text-emerald-800">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs uppercase tracking-widest text-emerald-600">Current qty</p>
                <p className="text-lg font-semibold text-emerald-900">
                  {currentTotal.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-xs uppercase tracking-widest text-blue-600">Previous qty</p>
                <p className="text-lg font-semibold text-blue-900">
                  {previousTotal.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4">
          {chartLoading && <p className="text-emerald-500">Loading chart…</p>}
        {chartError && <p className="text-rose-600">{chartError}</p>}
        {!chartLoading && !chartError && chartData.length === 0 && !amountTotals && (
          <p className="text-emerald-700">No monthly totals detected in the SKU tables.</p>
        )}
        {!chartLoading && !chartError && (chartData.length > 0 || amountTotals) && (
          chartMetric === 'amount' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-widest text-emerald-600">ยอดรวมปีปัจจุบัน</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-900">
                  {currentAmountTotal.toLocaleString()}
                </p>
                <p className="text-sm text-emerald-700">จากข้อมูล SKU_dataCurrent</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs uppercase tracking-widest text-blue-600">ยอดรวมปีก่อน</p>
                <p className="mt-2 text-3xl font-semibold text-blue-900">
                  {previousAmountTotal.toLocaleString()}
                </p>
                <p className="text-sm text-blue-700">จากข้อมูล SKU_dataPrevious</p>
              </div>
            </div>
          ) : (
            <div className="h-80">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2f3eb" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => value.toLocaleString()}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
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
        </div>
      </section>

      <section className="panel">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-500">Search</p>
            <h3 className="text-lg font-semibold text-emerald-900">Filter SKU rows</h3>
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
            className="w-64 rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        {tableError && <p className="mt-3 text-rose-600">{tableError}</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
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
