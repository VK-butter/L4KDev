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
  const { filters, setDateRange, setCategories, setStatuses } = useSalesFilters();
  const categoriesKey = filters.categories.join('|');
  const statusesKey = filters.statuses.join('|');

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [categoryData, setCategoryData] = useState<
    AnalyticsCategoryBreakdown[]
  >([]);
  const [trendData, setTrendData] = useState<AnalyticsTimeseriesPoint[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [drilldownLoading, setDrilldownLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [drilldownStatus, setDrilldownStatus] = useState('all');
  const [drilldownData, setDrilldownData] =
    useState<AnalyticsDrilldownResponse | null>(null);
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
          analyticsApi.summary({
            dateStart,
            dateEnd,
            categories: filters.categories,
            statuses: filters.statuses
          }),
          analyticsApi.byCategory({
            dateStart,
            dateEnd,
            categories: filters.categories,
            statuses: filters.statuses
          }),
          analyticsApi.timeseries({
            dateStart,
            dateEnd,
            categories: filters.categories,
            statuses: filters.statuses
          })
        ]);
        if (abort.signal.aborted) return;
        setSummary(summaryRes.data.data);
        setCategoryData(categoryRes.data.data);
        setAvailableCategories(
          Array.from(new Set(categoryRes.data.data.map((entry) => entry.category)))
        );
        setTrendData(trendRes.data.data);
      } catch (error) {
        if (!abort.signal.aborted) {
          setSummaryError(
            error instanceof Error ? error.message : 'Unable to load analytics.'
          );
        }
      } finally {
        if (!abort.signal.aborted) {
          setSummaryLoading(false);
          setChartLoading(false);
        }
      }
    }
    fetchMetrics();
    return () => abort.abort();
  }, [dateStart, dateEnd, categoriesKey, statusesKey]);

  // Ensure a default selected category is present when data loads to improve UX and test stability
  useEffect(() => {
    if (!selectedCategory && categoryData.length > 0) {
      setSelectedCategory(categoryData[0].category);
    }
  }, [categoryData, selectedCategory]);

  useEffect(() => {
    setDrilldownPage(1);
  }, [dateStart, dateEnd, categoriesKey, statusesKey, selectedCategory, drilldownStatus]);

  useEffect(() => {
    if (
      selectedCategory &&
      filters.categories.length > 0 &&
      !filters.categories.includes(selectedCategory)
    ) {
      setSelectedCategory(null);
    }
  }, [filters.categories, selectedCategory]);

  useEffect(() => {
    const abort = new AbortController();
    async function fetchDrilldown() {
      setDrilldownLoading(true);
      try {
        const { data } = await analyticsApi.drilldown({
          dateStart,
          dateEnd,
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
        if (!abort.signal.aborted) {
          setDrilldownLoading(false);
        }
      }
    }
    fetchDrilldown();
    return () => abort.abort();
  }, [
    dateStart,
    dateEnd,
    categoriesKey,
    statusesKey,
    selectedCategory,
    drilldownStatus,
    drilldownPage
  ]);

  const toggleCategoryFilter = (category: string) => {
    if (filters.categories.includes(category)) {
      setCategories(filters.categories.filter((cat) => cat !== category));
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

  const statusFilterDescription = useMemo(() => {
    if (filters.statuses.length === 0) {
      return 'All statuses';
    }
    return filters.statuses.join(', ');
  }, [filters.statuses]);

  return (
    <div className="flex flex-col gap-6" data-testid="analytics-dashboard">
      {/* Always show DB preview at top (SELECT * pagination) */}
      <RawDbPreview />

      <section
        id="embedding-playground"
        className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
              Start Date
            </label>
            <input
              type="date"
              value={dateStart}
              data-testid="filter-date-start"
              onChange={(event) => setDateRange(event.target.value, dateEnd)}
              className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
              End Date
            </label>
            <input
              type="date"
              value={dateEnd}
              data-testid="filter-date-end"
              onChange={(event) => setDateRange(dateStart, event.target.value)}
              className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
              Categories
            </label>
            <div className="flex flex-wrap gap-2" data-testid="filter-categories">
              {availableCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategoryFilter(category)}
                  data-category={category}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    filters.categories.includes(category)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-emerald-100 text-emerald-500 hover:border-emerald-300'
                  }`}
                >
                  {category}
                </button>
              ))}
              {availableCategories.length === 0 && (
                <p className="text-xs text-emerald-400">Loading categories…</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
              Status ({statusFilterDescription})
            </label>
            <div className="flex items-center gap-3" data-testid="filter-statuses">
              {STATUS_OPTIONS.map((status) => (
                <label key={status} className="flex items-center gap-1 text-xs text-emerald-700">
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                    data-testid={`filter-status-${status.toLowerCase()}`}
                  />
                  {status}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <KpiBoard
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
      />

      <div className="grid gap-6 md:grid-cols-2" data-testid="analytics-charts">
        <RevenueByCategoryChart
          data={categoryData}
          loading={chartLoading}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <RevenueTrendChart data={trendData} loading={chartLoading} />
      </div>

      <OrderDrilldownPanel
        data={drilldownData}
        loading={drilldownLoading}
        selectedCategory={selectedCategory}
        onClearCategory={() => setSelectedCategory(null)}
        statusFilter={drilldownStatus}
        onStatusChange={(status) => setDrilldownStatus(status)}
        onPageChange={setDrilldownPage}
      />

    </div>
  );
}
