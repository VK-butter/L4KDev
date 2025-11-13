import { apiClient } from './apiClient';

export interface IntegrationStatus {
  db: {
    host: string;
    port: number;
    database: string;
    userMasked?: string;
    hasEnv: boolean;
    pingOk: boolean;
  };
  table: {
    schema: string;
    name: string;
    rowCount?: number;
  };
  endpoints: { rawOrders: string };
  notes: { ssh: string };
}

export const integrationsApi = {
  status: () => apiClient.get<IntegrationStatus>('/integrations/status')
};

export interface SupersetConfigPayload {
  baseUrl: string;
  username: string;
  password: string;
  dashboardUrl?: string;
}

export interface SupersetStatusResponse {
  configured: boolean;
  loginOk: boolean;
  dashboards?: Array<{ id: string; title: string; url: string }>;
  error?: string;
}

export const supersetIntegrationApi = {
  saveConfig: (payload: SupersetConfigPayload) =>
    apiClient.post('/integrations/superset/config', payload),
  status: () => apiClient.get<SupersetStatusResponse>('/integrations/superset/status'),
  listDashboards: () => apiClient.get<{ dashboards: Array<{ id: string; title: string; url: string }> }>(
    '/integrations/superset/dashboards'
  ),
  addDashboard: (payload: { title: string; url: string }) =>
    apiClient.post<{ dashboard: { id: string; title: string; url: string } }>(
      '/integrations/superset/dashboards',
      payload
    ),
  updateDashboard: (id: string, payload: { title?: string; url?: string }) =>
    apiClient.patch<{ dashboard: { id: string; title: string; url: string } }>(
      `/integrations/superset/dashboards/${id}`,
      payload
    ),
  deleteDashboard: (id: string) => apiClient.delete(`/integrations/superset/dashboards/${id}`)
};
