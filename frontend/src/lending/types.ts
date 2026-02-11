/**
 * Lending Types
 * Type definitions for lending markets and user positions.
 * All keys are camelCase — the shared API interceptor handles normalization.
 */

export interface LendingMarket {
  market: string;
  underlying: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  totalBorrows: number;
  totalReserves: number;
  cash: number;
  exchangeRate: number;
  utilization: number;
  borrowRatePerYear: number;
  supplyRatePerYear: number;
  supplyAprPct?: number;
  borrowAprPct?: number;
  supplyAPY?: number;
  borrowAPY?: number;
  price: number;
  priceUsd?: number;
  totalSupplyUsd?: number;
  totalBorrowsUsd?: number;
  totalSupplyUnderlying?: number;
  totalBorrowsUnderlying?: number;
  collateralFactor: number;
  isListed: boolean;
}

export interface UserPosition {
  market: string;
  underlying: string;
  symbol: string;
  decimals: number;
  supplyDToken: number;
  supplyUnderlying: number;
  borrowBalance: number;
  exchangeRate: number;
  price: number;
  priceUsd?: number;
  collateralFactor: number;
  isListed: boolean;
  supplyAPY: number;
  borrowAPY: number;
  supplyAprPct?: number;
  borrowAprPct?: number;
}

export interface AccountData {
  account: string;
  liquidity: number;
  liquidityUsd?: number;
  shortfall: number;
  isHealthy: boolean;
  positions: UserPosition[];
  totalSupplied: number;
  totalBorrowed: number;
  borrowLimit: number;
  availableToBorrow: number;
}

export interface TransactionEvent {
  id: string;
  contract: string;
  event: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  timestamp?: number;
  args: Record<string, unknown>;
}

export type LendingAction = 'supply' | 'withdraw' | 'borrow' | 'repay';
