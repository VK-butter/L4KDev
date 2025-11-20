import type { EmbeddingTarget } from '@shared/index';
import { apiClient } from './apiClient';

export interface EmbedMetadataResponse {
  embeds: EmbeddingTarget[];
}

export interface NocoDbRecordsResponse {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
}

export const embedApi = {
  list: () => apiClient.get<EmbedMetadataResponse>('/analytics/embeds'),
  fetchNocoRecords: (
    targetId: string,
    params?: { limit?: number; offset?: number }
  ) =>
    apiClient.get<NocoDbRecordsResponse>(
      `/analytics/embeds/nocodb/${encodeURIComponent(targetId)}/records`,
      { params }
    )
};
