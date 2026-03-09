import type {
  AnalyticsCategoryBreakdown,
  AnalyticsDrilldownResponse,
  AnalyticsSummary,
  AnalyticsTimeseriesPoint
} from '@shared/index';
import { apiClient } from './apiClient';

export interface AnalyticsFilterParams {
  dateStart: string;
  dateEnd: string;
  categories?: string[];
  statuses?: string[];
}

type QueryParams = AnalyticsFilterParams & {
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

type RawOrderRow = Record<string, unknown>;

export interface RawOrdersPage {
  columns: string[];
  rows: RawOrderRow[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface VsStageFilter {
  dateStart: string;
  dateEnd: string;
  statuses?: string[];
  channels?: string[];
  categories?: string[];
}

export interface VsOptionsResponse {
  channels: string[];
  categories: string[];
}

export interface VsBreakdownItem {
  key: string;
  orders: number;
  revenue: number;
  quantity: number;
}

export interface VsStageMetrics {
  kpi: {
    totalOrders: number;
    totalRevenue: number;
    totalQuantity: number;
  };
  topChannels: VsBreakdownItem[];
  topCategories: VsBreakdownItem[];
}

export interface VsCompareRequest {
  stageA: VsStageFilter;
  stageB: VsStageFilter;
}

export interface VsPivotCell {
  orders: number;
  revenue: number;
  quantity: number;
}

export interface VsPivotColumnHeader {
  channel: string;
  category: string;
}

export interface VsPivotMonth {
  monthIndex: number;
  label: string;
  cells: VsPivotCell[];
}

export interface VsPivotResponse {
  columnHeaders: VsPivotColumnHeader[];
  months: VsPivotMonth[];
}

export interface VsCompareResponse {
  stageA: VsStageMetrics;
  stageB: VsStageMetrics;
  delta: {
    orders: { absolute: number; percent: number | null };
    revenue: { absolute: number; percent: number | null };
    quantity: { absolute: number; percent: number | null };
  };
  chart: Array<{ metric: string; stageA: number; stageB: number }>;
}

export interface SalesTargetFilter {
  dateStart: string;
  dateEnd: string;
  statuses?: string[];
  channels?: string[];
  categories?: string[];
}

export interface SalesTargetOptionsResponse {
  channels: string[];
  categories: string[];
}

export interface SalesTargetBreakdownItem {
  key: string;
  actualRevenue: number;
  targetRevenue: number;
  gapRevenue: number;
  achievementPct: number | null;
}

export interface SalesTargetCompareResponse {
  kpi: {
    actualRevenue: number;
    targetRevenue: number;
    gapRevenue: number;
    achievementPct: number | null;
  };
  chart: Array<{
    month: string;
    actualRevenue: number;
    targetRevenue: number;
    gapRevenue: number;
    achievementPct: number | null;
  }>;
  breakdownByChannel: SalesTargetBreakdownItem[];
  breakdownByCategory: SalesTargetBreakdownItem[];
}

export interface TargetPivotCell {
  target: number;
  actualCurrent: number;
  actualPrevious: number;
}

export interface TargetPivotMonth {
  monthIndex: number;
  label: string;
  cells: TargetPivotCell[];
}

export interface TargetPivotResponse {
  year: number;
  columnHeaders: Array<{ channel: string; category: string }>;
  months: TargetPivotMonth[];
}

function buildQuery(params: QueryParams) {
  const searchParams = new URLSearchParams();
  searchParams.set('dateStart', params.dateStart);
  searchParams.set('dateEnd', params.dateEnd);
  if (params.categories && params.categories.length > 0) {
    searchParams.set('categories', params.categories.join(','));
  }
  if (params.statuses && params.statuses.length > 0) {
    searchParams.set('statuses', params.statuses.join(','));
  }
  if (typeof params.category === 'string') {
    searchParams.set('category', params.category);
  }
  if (typeof params.status === 'string') {
    searchParams.set('status', params.status);
  }
  if (typeof params.page === 'number') {
    searchParams.set('page', String(params.page));
  }
  if (typeof params.pageSize === 'number') {
    searchParams.set('pageSize', String(params.pageSize));
  }
  return searchParams.toString();
}

export const analyticsApi = {
  summary: (params: AnalyticsFilterParams) =>
    apiClient.get<{ data: AnalyticsSummary }>(
      `/analytics/orders/summary?${buildQuery(params)}`
    ),
  byCategory: (params: AnalyticsFilterParams) =>
    apiClient.get<{ data: AnalyticsCategoryBreakdown[] }>(
      `/analytics/orders/by-category?${buildQuery(params)}`
    ),
  timeseries: (params: AnalyticsFilterParams) =>
    apiClient.get<{ data: AnalyticsTimeseriesPoint[] }>(
      `/analytics/orders/timeseries?${buildQuery(params)}`
    ),
  drilldown: (
    params: AnalyticsFilterParams & {
      category?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }
  ) =>
    apiClient.get<{ data: AnalyticsDrilldownResponse }>(
      `/analytics/orders/drilldown?${buildQuery(params)}`
    ),
  rawOrders: (params: { page?: number; pageSize?: number; dateStart?: string; dateEnd?: string; status?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (typeof params.page === 'number') sp.set('page', String(params.page));
    if (typeof params.pageSize === 'number') sp.set('pageSize', String(params.pageSize));
    if (params.dateStart) sp.set('dateStart', params.dateStart);
    if (params.dateEnd) sp.set('dateEnd', params.dateEnd);
    if (params.status) sp.set('status', params.status);
    if (params.q) sp.set('q', params.q);
    return apiClient.get<{ data: RawOrdersPage }>(
      `/analytics/orders/raw?${sp.toString()}`
    );
  }
};

export const analyticsSummaryApi = {
  rawSummary: (params: { dateStart?: string; dateEnd?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params.dateStart) sp.set('dateStart', params.dateStart);
    if (params.dateEnd) sp.set('dateEnd', params.dateEnd);
    if (params.status) sp.set('status', params.status);
    return apiClient.get<{ data: { totalRecords: number; totalRevenue?: number; totalQuantity?: number } }>(
      `/analytics/orders/raw/summary?${sp.toString()}`
    );
  }
};

export const analyticsStatusApi = {
  rawStatus: (params: { dateStart?: string; dateEnd?: string }) => {
    const sp = new URLSearchParams();
    if (params.dateStart) sp.set('dateStart', params.dateStart);
    if (params.dateEnd) sp.set('dateEnd', params.dateEnd);
    return apiClient.get<{ data: { total: number; rows: Array<{ status: string; count: number }> } }>(
      `/analytics/orders/raw/status?${sp.toString()}`
    );
  }
};

export const analyticsVsApi = {
  getVsOptions: (stage: VsStageFilter) =>
    apiClient.post<{ data: VsOptionsResponse }>('/analytics/orders/vs/options', stage),
  compareVs: (payload: VsCompareRequest) =>
    apiClient.post<{ data: VsCompareResponse }>('/analytics/orders/vs/compare', payload),
  getPivot: (stage: VsStageFilter, granularity?: 'daily' | 'monthly' | 'yearly') =>
    apiClient.post<{ data: VsPivotResponse }>('/analytics/orders/vs/pivot', { ...stage, granularity: granularity ?? 'monthly' })
};

export const analyticsSalesTargetApi = {
  getSalesTargetOptions: (filterBase: SalesTargetFilter) =>
    apiClient.post<{ data: SalesTargetOptionsResponse }>('/analytics/orders/target/options', filterBase),
  compareSalesTarget: (filter: SalesTargetFilter) =>
    apiClient.post<{ data: SalesTargetCompareResponse }>('/analytics/orders/target/compare', filter),
  getTargetPivot: (params: { year: number; statuses?: string[]; channels?: string[]; categories?: string[] }) =>
    apiClient.post<{ data: TargetPivotResponse }>('/analytics/orders/target/pivot', params)
};
