import type { EmbeddingTarget } from '@shared/index';
import { apiClient } from './apiClient';

export interface EmbedMetadataResponse {
  embeds: EmbeddingTarget[];
}

export const embedApi = {
  list: () => apiClient.get<EmbedMetadataResponse>('/analytics/embeds'),
  nocodbPlaceholder: () =>
    apiClient.get<{ title: string; values: Array<{ week: string; orders: number }> }>(
      '/analytics/embeds/nocodb-placeholder'
    )
};
