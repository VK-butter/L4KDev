import { apiClient } from './apiClient';

export interface LoginPayload {
  username: string;
  password: string;
}

export const authApi = {
  login: (payload: LoginPayload) => apiClient.post('/auth/login', payload),
  logout: () => apiClient.post('/auth/logout'),
  session: () => apiClient.get('/auth/session')
};
