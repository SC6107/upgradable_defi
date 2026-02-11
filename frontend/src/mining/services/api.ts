/**
 * Mining API Service
 * Uses the shared apiClient which normalizes snake_case keys to camelCase automatically.
 */
import apiClient from '@/shared/services/apiClient';
import type {
  Market,
  Account,
  Event,
  ContractAddresses,
  LiquidityMiningPool,
  LiquidityMiningAccountPosition,
} from '@/shared/types/mining';
import type { HealthStatus } from '@/shared/types/common';

// Re-export types for existing consumers
export type {
  Market,
  Position,
  Account,
  Event,
  ContractAddressMarketDetail,
  ContractAddressLiquidityMiningDetail,
  ContractAddressRewardToken,
  ContractAddresses,
  LiquidityMiningPool,
  LiquidityMiningAccountPosition,
} from '@/shared/types/mining';
export type { HealthStatus } from '@/shared/types/common';

class APIService {
  async getHealth(): Promise<HealthStatus> {
    const response = await apiClient.get('/health');
    return response.data;
  }

  async getMarkets(): Promise<Market[]> {
    const response = await apiClient.get('/markets');
    return response.data?.items ?? [];
  }

  async getAccount(address: string): Promise<Account> {
    const response = await apiClient.get(`/accounts/${address}`);
    return response.data;
  }

  async getContractAddresses(refresh: boolean = false): Promise<ContractAddresses> {
    const response = await apiClient.get('/contracts/addresses', {
      params: refresh ? { refresh: 'true' } : undefined,
    });
    return response.data;
  }

  async getLiquidityMining(): Promise<LiquidityMiningPool[]> {
    const response = await apiClient.get('/liquidity-mining');
    return response.data.items ?? [];
  }

  async getLiquidityMiningAccount(address: string): Promise<LiquidityMiningAccountPosition[]> {
    const response = await apiClient.get(`/liquidity-mining/${address}`);
    return response.data ?? [];
  }

  async getEvents(
    contract?: string,
    event?: string,
    fromBlock?: number,
    toBlock?: number,
    limit: number = 100
  ): Promise<Event[]> {
    const params = new URLSearchParams();
    if (contract) params.append('contract', contract);
    if (event) params.append('event', event);
    if (fromBlock) params.append('fromBlock', fromBlock.toString());
    if (toBlock) params.append('toBlock', toBlock.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get('/events', { params });
    return response.data.items;
  }

  async getStats(
    contract?: string,
    event?: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<Record<string, unknown>> {
    const params = new URLSearchParams();
    if (contract) params.append('contract', contract);
    if (event) params.append('event', event);
    if (fromBlock) params.append('fromBlock', fromBlock.toString());
    if (toBlock) params.append('toBlock', toBlock.toString());

    const response = await apiClient.get('/stats', { params });
    return response.data.items;
  }
}

export default new APIService();
