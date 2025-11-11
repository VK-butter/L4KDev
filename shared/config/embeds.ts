import type { EmbeddingTarget } from '../types';

export const embeddingTargets: EmbeddingTarget[] = [
  {
    id: 'superset-main',
    type: 'iframe',
    title: 'Superset Sales Overview',
    description:
      'Embed Apache Superset dashboards via SSH tunnel once credentials are configured.',
    placeholderUrl: 'https://dashboards.example.com/superset-placeholder',
    status: 'placeholder',
    integrationNotes:
      'Replace placeholderUrl with the tunneled Superset URL and ensure cookie-based auth is forwarded through the API gateway.'
  },
  {
    id: 'nocodb-orders',
    type: 'api',
    title: 'NocoDB Order Tracker',
    description:
      'Displays live metrics from a NocoDB workspace; currently powered by mock API data.',
    placeholderUrl: '/api/analytics/nocodb-placeholder',
    status: 'placeholder',
    integrationNotes:
      'Swap placeholderUrl with the NocoDB REST endpoint, include API token headers, and adjust schema mapping inside the embedding service.'
  }
];
