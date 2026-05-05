import { useEffect, useMemo, useState } from 'react';
import type {
  AnalyticsCategoryBreakdown,
  AnalyticsDrilldownResponse,
  AnalyticsSummary,
  AnalyticsTimeseriesPoint
} from '@shared/index';
import { useSalesFilters } from '../hooks/useSalesFilters';
import { analyticsApi } from '../services/analyticsApi';
import { KpiBoard } from '../components/analytics/KpiBoard';
import { RevenueByCategoryChart } from '../components/analytics/RevenueByCategoryChart';
import { RevenueTrendChart } from '../components/analytics/RevenueTrendChart';
import { OrderDrilldownPanel } from '../components/analytics/OrderDrilldownPanel';
import { RawDbPreview } from '../components/analytics/RawDbPreview';

const STATUS_OPTIONS = ['Pending', 'Fulfilled', 'Cancelled'];

export function DashboardHome() {
  const { filters, setDateRange, setDateRanges, setCategories, setStatuses } = useSalesFilters();
  const categoriesKey = filters.categories.join('|');
  const statusesKey = filters.statuses.join('|');

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [categoryData, setCategoryData] = useState<AnalyticsCategoryBreakdown[]>([]);
  const [trendData, setTrendData] = useState<AnalyticsTimeseriesPoint[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [drilldownLoading, setDrilldownLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [drilldownStatus, setDrilldownStatus] = useState('all');
  const [drilldownData, setDrilldownData] = useState<AnalyticsDrilldownResponse | null>(null);
  const [drilldownPage, setDrilldownPage] = useState(1);

  const [dateStart, dateEnd] = filters.dateRange;

  useEffect(() => {
    const abort = new AbortController();
    async function fetchMetrics() {
      setSummaryLoading(true);
      setChartLoading(true);
      setSummaryError(null);
      try {
        const [summaryRes, categoryRes, trendRes] = await Promise.all([
          analyticsApi.summary({ dateStart, dateEnd, dateRanges: filters.dateRanges, categories: filters.categories, statuses: filters.statuses }),
          analyticsApi.byCategory({ dateStart, dateEnd, dateRanges: filters.dateRanges, categories: filters.categories, statuses: filters.statuses }),
          analyticsApi.timeseries({ dateStart, dateEnd, dateRanges: filters.dateRanges, categories: filters.categories, statuses: filters.statuses })
        ]);
        if (abort.signal.aborted) return;
        setSummary(summaryRes.data.data);
        setCategoryData(categoryRes.data.data);
        setAvailableCategories(Array.from(new Set(categoryRes.data.data.map((e) => e.category))));
        setTrendData(trendRes.data.data);
      } catch (error) {
        if (!abort.signal.aborted) {
          setSummaryError(error instanceof Error ? error.message : 'Unable to load analytics.');
        }
      } finally {
        if (!abort.signal.aborted) { setSummaryLoading(false); setChartLoading(false); }
      }
    }
    fetchMetrics();
    return () => abort.abort();
  }, [dateStart, dateEnd, categoriesKey, statusesKey]);

  useEffect(() => {
    if (!selectedCategory && categoryData.length > 0) setSelectedCategory(categoryData[0].category);
  }, [categoryData, selectedCategory]);

  useEffect(() => { setDrilldownPage(1); }, [dateStart, dateEnd, categoriesKey, statusesKey, selectedCategory, drilldownStatus]);

  useEffect(() => {
    if (selectedCategory && filters.categories.length > 0 && !filters.categories.includes(selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [filters.categories, selectedCategory]);

  useEffect(() => {
    const abort = new AbortController();
    async function fetchDrilldown() {
      setDrilldownLoading(true);
      try {
        const { data } = await analyticsApi.drilldown({
          dateStart, dateEnd, dateRanges: filters.dateRanges,
          categories: filters.categories,
          statuses: filters.statuses,
          category: selectedCategory ?? undefined,
          status: drilldownStatus === 'all' ? undefined : drilldownStatus,
          page: drilldownPage,
          pageSize: 20
        });
        if (abort.signal.aborted) return;
        setDrilldownData(data.data);
      } finally {
        if (!abort.signal.aborted) setDrilldownLoading(false);
      }
    }
    fetchDrilldown();
    return () => abort.abort();
  }, [dateStart, dateEnd, categoriesKey, statusesKey, selectedCategory, drilldownStatus, drilldownPage]);

  const toggleCategoryFilter = (category: string) => {
    if (filters.categories.includes(category)) {
      setCategories(filters.categories.filter((c) => c !== category));
    } else {
      setCategories([...filters.categories, category]);
    }
  };

  const toggleStatus = (status: string) => {
    if (filters.statuses.includes(status)) {
      setStatuses(filters.statuses.filter((s) => s !== status));
    } else {
      setStatuses([...filters.statuses, status]);
    }
  };

  const updateDateRangeRow = (index: number, patch: { start?: string; end?: string }) => {
    const next = filters.dateRanges.map((r, i) => (i === index ? { ...r, ...patch } : r));
    setDateRanges(next);
  };

  const removeDateRangeRow = (index: number) => {
    const next = filters.dateRanges.filter((_, i) => i !== index);
    setDateRanges(next);
  };

  const statusFilterDescription = useMemo(
    () => filters.statuses.length === 0 ? 'All' : filters.statuses.join(', '),
    [filters.statuses]
  );

  return (
    <div className="flex flex-col gap-5" data-testid="analytics-dashboard">
      <div>
        <p className="section-heading">Analytics</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-emerald-50">Overview Dashboard</h1>
      </div>

      <RawDbPreview />

      <section id="embedding-playground" className="panel">
        <div className="mb-3 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden="true">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <p className="text-sm font-semibold text-gray-700 dark:text-emerald-200">Filters</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="section-heading">Date Ranges</label>
            <div className="space-y-2">
              {filters.dateRanges.map((range, idx) => (
                <div key={`dash-range-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input type="date" value={range.start} data-testid="filter-date-start"
                    onChange={(e) => updateDateRangeRow(idx, { start: e.target.value })} className="input" />
                  <input type="date" value={range.end} data-testid="filter-date-end"
                    onChange={(e) => updateDateRangeRow(idx, { end: e.target.value })} className="input" />
                  <button type="button" onClick={() => removeDateRangeRow(idx)} className="btn-sm btn-outline">Remove</button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDateRanges([...filters.dateRanges, { start: dateStart, end: dateEnd }])}
                  className="btn-sm btn-outline"
                >
                  Add Range
                </button>
                <button type="button" onClick={() => setDateRange(dateStart, dateEnd)} className="btn-sm btn-outline">
                  Use Single Range
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="section-heading">Categories</label>
            <div className="flex flex-wrap gap-1.5" data-testid="filter-categories">
              {availableCategories.map((category) => (
                <button key={category} type="button" onClick={() => toggleCategoryFilter(category)}
                  data-category={category}
                  className={`chip ${filters.categories.includes(category) ? 'chip-active' : ''}`}>
                  {category}
                </button>
              ))}
              {availableCategories.length === 0 && (
                <span className="text-xs text-gray-400 dark:text-emerald-600">Loading...</span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="section-heading">Status ({statusFilterDescription})</label>
            <div className="flex flex-wrap items-center gap-2" data-testid="filter-statuses">
              {STATUS_OPTIONS.map((status) => (
                <label key={status} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600 dark:text-emerald-300">
                  <input type="checkbox" checked={filters.statuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                    data-testid={`filter-status-${status.toLowerCase()}`}
                    className="h-3.5 w-3.5 accent-emerald-600" />
                  {status}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <KpiBoard summary={summary} loading={summaryLoading} error={summaryError} />

      <div className="grid gap-5 md:grid-cols-2" data-testid="analytics-charts">
        <RevenueByCategoryChart data={categoryData} loading={chartLoading}
          selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
        <RevenueTrendChart data={trendData} loading={chartLoading} />
      </div>

      <OrderDrilldownPanel data={drilldownData} loading={drilldownLoading}
        selectedCategory={selectedCategory} onClearCategory={() => setSelectedCategory(null)}
        statusFilter={drilldownStatus} onStatusChange={setDrilldownStatus}
        onPageChange={setDrilldownPage} />
    </div>
  );
}
