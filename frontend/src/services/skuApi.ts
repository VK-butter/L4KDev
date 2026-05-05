import { apiClient } from './apiClient';

export type SkuPeriod = 'current' | 'previous';

export interface SkuRawPage {
  columns: string[];
  rows: Record<string, unknown>[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface MonthComparisonItem {
  monthLabel: string;
  monthIndex: number | null;
  currentQty: number;
  previousQty: number;
  currentAmount: number;
  previousAmount: number;
}

export interface MonthComparisonResponse {
  months: MonthComparisonItem[];
  currentYear: number;
  previousYear: number;
  moveSummary?: {
    current: Record<string, number>;
    previous: Record<string, number>;
  };
  amountTotals?: { currentAmount: number; previousAmount: number };
}

export const skuApi = {
  getRaw: (
    period: SkuPeriod,
    params: { page?: number; pageSize?: number; q?: string; moveTypes?: string[] } = {}
  ) => {
    const sp = new URLSearchParams();
    sp.set('period', period);
    if (typeof params.page === 'number') sp.set('page', String(params.page));
    if (typeof params.pageSize === 'number') sp.set('pageSize', String(params.pageSize));
    if (params.q && params.q.trim()) sp.set('q', params.q.trim());
    if (params.moveTypes && params.moveTypes.length > 0) sp.set('moveTypes', params.moveTypes.join(','));
    return apiClient.get<{ data: SkuRawPage }>(`/analytics/sku/raw?${sp.toString()}`);
  },
  getMonthlyComparison: (params?: { moveTypes?: string[] }) => {
    const sp = new URLSearchParams();
    if (params?.moveTypes && params.moveTypes.length > 0) sp.set('moveTypes', params.moveTypes.join(','));
    return apiClient.get<{
      data: MonthComparisonResponse;
    }>(`/analytics/sku/monthly-comparison?${sp.toString()}`);
  }
};
