/**
 * Shared axios instance used by both lending and mining API services.
 * Includes a response interceptor that normalizes snake_case keys to camelCase.
 */
import axios from 'axios';
import { normalizeKeys } from '../utils/normalize';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

apiClient.interceptors.response.use((response) => {
  response.data = normalizeKeys(response.data);
  return response;
});

export default apiClient;

export interface HealthStatus {
  chainId: number;
  latestBlock: number;
  indexedToBlock: number;
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await apiClient.get('/health');
  return response.data;
}
