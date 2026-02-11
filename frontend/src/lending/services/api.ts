/**
 * Lending API Service
 * Uses the shared apiClient which normalizes snake_case keys to camelCase automatically.
 */
import { getAddress } from 'ethers';
import apiClient from '@/shared/services/apiClient';
import type { LendingMarket, AccountData, TransactionEvent, UserPosition } from '../types';

function _num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

class LendingAPIService {
  async getHealth() {
    const response = await apiClient.get('/health');
    return response.data;
  }

  async getMarkets(): Promise<LendingMarket[]> {
    const response = await apiClient.get('/markets');
    return response.data?.items ?? [];
  }

  /**
   * Get account data including positions and health.
   * The interceptor guarantees camelCase keys; we just coerce numeric fields.
   */
  async getAccount(address: string): Promise<AccountData> {
    const checksummed = getAddress(address);
    const response = await apiClient.get(`/accounts/${checksummed}`);
    const data = response.data;
    const rawPositions: Record<string, unknown>[] = data.positions || [];

    const positions: UserPosition[] = rawPositions.map((pos) => {
      const supplyUnderlying = _num(pos.supplyUnderlying);
      const borrowBalance = _num(pos.borrowBalance);
      const price = _num(pos.price ?? pos.priceUsd);
      const supplyRatePerYear = _num(pos.supplyRatePerYear);
      const borrowRatePerYear = _num(pos.borrowRatePerYear);
      const supplyAprPct = _num(pos.supplyAprPct);
      const borrowAprPct = _num(pos.borrowAprPct);
      const collateralFactor = _num(pos.collateralFactor);
      return {
        ...pos,
        supplyUnderlying,
        borrowBalance,
        price,
        priceUsd: price,
        supplyRatePerYear,
        borrowRatePerYear,
        supplyAprPct,
        borrowAprPct,
        collateralFactor,
      } as unknown as UserPosition;
    });

    const totalSupplied =
      typeof data.totalSuppliedUsd === 'number' && Number.isFinite(data.totalSuppliedUsd)
        ? data.totalSuppliedUsd
        : positions.reduce((sum: number, pos: UserPosition) => {
            const price = pos.price ?? pos.priceUsd ?? 0;
            return sum + (pos.supplyUnderlying ?? 0) * price;
          }, 0);

    const totalBorrowed =
      typeof data.totalBorrowedUsd === 'number' && Number.isFinite(data.totalBorrowedUsd)
        ? data.totalBorrowedUsd
        : positions.reduce((sum: number, pos: UserPosition) => {
            const price = pos.price ?? pos.priceUsd ?? 0;
            return sum + (pos.borrowBalance ?? 0) * price;
          }, 0);

    const borrowLimitFromPositions = positions.reduce((sum: number, pos: UserPosition) => {
      const price = pos.price ?? pos.priceUsd ?? 0;
      const supplyValue = (pos.supplyUnderlying ?? 0) * price;
      return sum + supplyValue * (pos.collateralFactor ?? 0);
    }, 0);

    const liquidityUsd = data.liquidityUsd ?? data.liquidity;
    const borrowLimit =
      typeof liquidityUsd === 'number' && liquidityUsd > 0
        ? totalBorrowed + liquidityUsd
        : borrowLimitFromPositions;
    const availableToBorrow =
      typeof liquidityUsd === 'number' && liquidityUsd > 0
        ? liquidityUsd
        : Math.max(0, borrowLimit - totalBorrowed);

    return {
      ...data,
      positions,
      totalSupplied,
      totalBorrowed,
      borrowLimit,
      availableToBorrow,
    };
  }

  async getEvents(
    contract?: string,
    event?: string,
    account?: string,
    fromBlock?: number,
    toBlock?: number,
    limit: number = 100
  ): Promise<TransactionEvent[]> {
    const params = new URLSearchParams();
    if (contract) params.append('contract', contract);
    if (event) params.append('event', event);
    if (account) params.append('account', account);
    if (fromBlock) params.append('fromBlock', fromBlock.toString());
    if (toBlock) params.append('toBlock', toBlock.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get('/events', { params });
    return response.data.items || [];
  }

  async getMarketStats(marketAddress: string): Promise<Record<string, unknown>> {
    const response = await apiClient.get(`/markets/${marketAddress}/stats`);
    return response.data;
  }

  async getContractAddresses(): Promise<{ comptroller?: string | null }> {
    const response = await apiClient.get('/contracts/addresses');
    return response.data ?? {};
  }
}

export default new LendingAPIService();
