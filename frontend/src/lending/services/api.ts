/**
 * Lending API Service
 * Handles all API calls for lending markets and user data
 */
import axios from 'axios';
import { getAddress } from 'ethers';
import type { LendingMarket, AccountData, TransactionEvent, UserPosition } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Sepolia reads can exceed 10s due multiple on-chain RPC calls.
  timeout: 60000,
});

interface HealthStatus {
  chainId: number;
  latestBlock: number;
  indexedToBlock: number;
}

function _num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

class LendingAPIService {
  /**
   * Get system health status
   */
  async getHealth(): Promise<HealthStatus> {
    const response = await apiClient.get('/health');
    return response.data;
  }

  /**
   * Get all lending markets
   */
  async getMarkets(): Promise<LendingMarket[]> {
    const response = await apiClient.get('/markets');
    return response.data?.items ?? [];
  }

  /**
   * Get account data including positions and health.
   * Expects backend to return human units: supplyUnderlying/borrowBalance (token amount),
   * price/priceUsd (USD per token). Value USD = balance × price (plain USD).
   */
  async getAccount(address: string): Promise<AccountData> {
    const checksummed = getAddress(address);
    const response = await apiClient.get(`/accounts/${checksummed}`);
    const data = response.data;
    let positions = data.positions || [];
    // Normalize: ensure camelCase and numbers (backend may send snake_case or null)
    positions = positions.map((pos: Record<string, unknown>) => {
      const supplyUnderlying = _num(pos.supplyUnderlying ?? pos.supply_underlying ?? 0);
      const borrowBalance = _num(pos.borrowBalance ?? pos.borrow_balance ?? 0);
      const price = _num(pos.price ?? pos.priceUsd ?? (pos as { price_usd?: number }).price_usd ?? 0);
      const supplyRatePerYear = _num(pos.supplyRatePerYear ?? (pos as { supply_rate_per_year?: number }).supply_rate_per_year);
      const borrowRatePerYear = _num(pos.borrowRatePerYear ?? (pos as { borrow_rate_per_year?: number }).borrow_rate_per_year);
      const supplyAprPct = _num(pos.supplyAprPct ?? (pos as { supply_apr_pct?: number }).supply_apr_pct);
      const borrowAprPct = _num(pos.borrowAprPct ?? (pos as { borrow_apr_pct?: number }).borrow_apr_pct);
      const collateralFactor = _num(pos.collateralFactor ?? (pos as { collateral_factor?: number }).collateral_factor);
      return {
        ...pos,
        supplyUnderlying,
        borrowBalance,
        price: Number.isFinite(price) ? price : 0,
        priceUsd: Number.isFinite(price) ? price : 0,
        supplyRatePerYear: Number.isFinite(supplyRatePerYear) ? supplyRatePerYear : 0,
        borrowRatePerYear: Number.isFinite(borrowRatePerYear) ? borrowRatePerYear : 0,
        supplyAprPct: Number.isFinite(supplyAprPct) ? supplyAprPct : 0,
        borrowAprPct: Number.isFinite(borrowAprPct) ? borrowAprPct : 0,
        collateralFactor: Number.isFinite(collateralFactor) ? collateralFactor : 0,
      };
    }) as UserPosition[];
    // Prefer backend totals (totalSuppliedUsd/totalBorrowedUsd) when present for sync with Positions
    const totalSupplied =
      typeof (data as { totalSuppliedUsd?: number }).totalSuppliedUsd === 'number' &&
      Number.isFinite((data as { totalSuppliedUsd?: number }).totalSuppliedUsd)
        ? (data as { totalSuppliedUsd: number }).totalSuppliedUsd
        : positions.reduce((sum: number, pos: UserPosition) => {
            const price = pos.price ?? (pos as { priceUsd?: number }).priceUsd ?? 0;
            return sum + (pos.supplyUnderlying ?? 0) * price;
          }, 0);
    const totalBorrowed =
      typeof (data as { totalBorrowedUsd?: number }).totalBorrowedUsd === 'number' &&
      Number.isFinite((data as { totalBorrowedUsd?: number }).totalBorrowedUsd)
        ? (data as { totalBorrowedUsd: number }).totalBorrowedUsd
        : positions.reduce((sum: number, pos: UserPosition) => {
            const price = pos.price ?? (pos as { priceUsd?: number }).priceUsd ?? 0;
            return sum + (pos.borrowBalance ?? 0) * price;
          }, 0);
    const borrowLimitFromPositions = positions.reduce((sum: number, pos: UserPosition) => {
      const price = pos.price ?? (pos as { priceUsd?: number }).priceUsd ?? 0;
      const supplyValue = (pos.supplyUnderlying ?? 0) * price;
      return sum + supplyValue * (pos.collateralFactor ?? 0);
    }, 0);
    const liquidityUsd = data.liquidityUsd ?? data.liquidity;
    // When user hasn't entered markets or chain returns 0, liquidity is 0 but we still use theoretical limit from collateral
    const borrowLimit =
      typeof liquidityUsd === 'number' && liquidityUsd > 0
        ? totalBorrowed + liquidityUsd
        : borrowLimitFromPositions;
    // Use chain liquidity when > 0; otherwise fall back to theoretical (borrowLimit - totalBorrowed) so borrow works after supply
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

  /**
   * Get transaction events
   */
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

  /**
   * Get market statistics
   */
  async getMarketStats(marketAddress: string): Promise<Record<string, unknown>> {
    const response = await apiClient.get(`/markets/${marketAddress}/stats`);
    return response.data;
  }

  /**
   * Get protocol contract addresses (comptroller for enterMarkets)
   */
  async getContractAddresses(): Promise<{ comptroller?: string | null }> {
    const response = await apiClient.get('/contracts/addresses');
    return response.data ?? {};
  }
}

export default new LendingAPIService();
