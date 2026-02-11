/**
 * Mining-related type definitions.
 * Extracted from mining/services/api.ts for reuse.
 */

export interface Market {
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
  price: number;
  collateralFactor: number;
  isListed: boolean;
}

export interface Position {
  market: string;
  underlying: string;
  symbol: string;
  decimals: number;
  supplyDToken: number;
  supplyUnderlying: number;
  borrowBalance: number;
  exchangeRate: number;
  price: number;
  collateralFactor: number;
  isListed: boolean;
}

export interface Account {
  account: string;
  liquidity: number;
  shortfall: number;
  isHealthy: boolean;
  positions: Position[];
}

export interface Event {
  id: string;
  contract: string;
  event: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  args: Record<string, unknown>;
}

export interface ContractAddressMarketDetail {
  market: string;
  underlying: string | null;
  symbol: string | null;
  decimals: number | null;
}

export interface ContractAddressLiquidityMiningDetail {
  mining: string;
  stakingToken: string | null;
  stakingSymbol: string | null;
  rewardsToken: string | null;
  rewardsSymbol: string | null;
}

export interface ContractAddressRewardToken {
  token: string;
  symbol: string | null;
  decimals: number | null;
}

export interface ContractAddresses {
  chainId: number;
  comptroller: string | null;
  priceOracle: string | null;
  markets: string[];
  liquidityMining: string[];
  marketDetails: ContractAddressMarketDetail[];
  liquidityMiningDetails: ContractAddressLiquidityMiningDetail[];
  rewardTokens: ContractAddressRewardToken[];
  governor?: string | null;
  protocolTimelock?: string | null;
}

export interface LiquidityMiningPool {
  mining: string;
  stakingToken: string | null;
  stakingSymbol: string | null;
  stakingDecimals: number | null;
  rewardsToken: string | null;
  rewardsSymbol: string | null;
  rewardsDecimals: number | null;
  rewardRate: number | null;
  totalStaked: number | null;
  rewardsDuration: number | null;
  periodFinish: number | null;
  apr?: number | null;
  apy?: number | null;
}

export interface LiquidityMiningAccountPosition {
  mining: string;
  stakingToken: string | null;
  stakingSymbol: string | null;
  stakedBalance: number | null;
  earned: number | null;
  rewardsSymbol: string | null;
}
