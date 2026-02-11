/**
 * Lending Types
 * Type definitions for lending markets and user positions
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
  supply_rate_per_year?: number;
  borrow_rate_per_year?: number;
  price: number;
  priceUsd?: number;
  totalSupplyUsd?: number;
  totalBorrowsUsd?: number;
  totalSupplyUnderlying?: number;
  totalBorrowsUnderlying?: number;
  total_supply_usd?: number;
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
  supply_rate_per_year?: number;
  borrow_rate_per_year?: number;
  supply_underlying?: number;
  borrow_balance?: number;
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
