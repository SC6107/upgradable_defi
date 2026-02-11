/**
 * Lending-specific helpers.
 *
 * Unit convention (API / backend):
 * - Balance: human token amount (e.g. 100000 WETH)
 * - Price: USD per token (e.g. 2000)
 * - Value USD: balance × price, plain USD (e.g. 200000000)
 * - Rates: decimal (0.05 = 5%) or percentage (5.25); formatPct handles both
 */

import { formatAddress } from '@/shared/utils/format';

// Re-export as shortAddress for backward compat within lending components
export const shortAddress = formatAddress;

export function formatPct(value: number | undefined | null): string {
  const n = value != null ? Number(value) : 0;
  if (!Number.isFinite(n)) return '0.00';
  return (n < 1 ? n * 100 : n).toFixed(2);
}

export function getPrice(p: { price?: number; priceUsd?: number }): number {
  return p.price ?? p.priceUsd ?? 0;
}

type NumericLike = number | string | null | undefined;

type RateSource = {
  supplyRatePerYear?: NumericLike;
  borrowRatePerYear?: NumericLike;
  supplyAprPct?: NumericLike;
  borrowAprPct?: NumericLike;
  supplyAPY?: NumericLike;
  borrowAPY?: NumericLike;
};

export function getSupplyApy(item: RateSource, marketFallback?: RateSource | null): number | undefined {
  const raw =
    item.supplyAprPct ??
    item.supplyRatePerYear ??
    item.supplyAPY;
  const n = raw != null ? Number(raw) : undefined;
  if (n != null && Number.isFinite(n)) return n;
  if (marketFallback) {
    const fromM =
      marketFallback.supplyAprPct ??
      marketFallback.supplyRatePerYear;
    const nm = fromM != null ? Number(fromM) : undefined;
    if (nm != null && Number.isFinite(nm)) return nm;
  }
  return undefined;
}

export function getBorrowApy(item: RateSource, marketFallback?: RateSource | null): number | undefined {
  const raw =
    item.borrowAprPct ??
    item.borrowRatePerYear ??
    item.borrowAPY;
  const n = raw != null ? Number(raw) : undefined;
  if (n != null && Number.isFinite(n)) return n;
  if (marketFallback) {
    const fromM =
      marketFallback.borrowAprPct ??
      marketFallback.borrowRatePerYear;
    const nm = fromM != null ? Number(fromM) : undefined;
    if (nm != null && Number.isFinite(nm)) return nm;
  }
  return undefined;
}

export function getMarketSupplyUsd(m: {
  totalSupplyUsd?: number;
  totalSupply?: number;
  totalSupplyUnderlying?: number;
  price?: number;
  priceUsd?: number;
}): number {
  const usd = m.totalSupplyUsd;
  if (usd != null && Number.isFinite(usd)) return usd;
  const supply = (m.totalSupply ?? m.totalSupplyUnderlying) ?? 0;
  const price = getPrice(m);
  return supply * price;
}

export function formatTvl(usd: number): string {
  if (!Number.isFinite(usd) || usd < 0) return '$0.00M';
  return `$${(usd / 1e6).toFixed(2)}M`;
}

export function formatUsd(n: number): string {
  const num = Number(n);
  if (num == null || !Number.isFinite(num) || num < 0) return '$0.00';
  return '$' + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatUsdAuto(usd: number): string {
  const num = Number(usd);
  if (num == null || !Number.isFinite(num) || num < 0) return '$0.00';
  return num >= 1e6 ? formatTvl(num) : formatUsd(num);
}

type PositionBalanceSource = {
  supplyUnderlying?: NumericLike;
  borrowBalance?: NumericLike;
};

export function getPositionBalance(
  p: PositionBalanceSource,
  key: 'supplyUnderlying' | 'borrowBalance'
): number {
  const n = p[key];
  if (n != null && Number.isFinite(Number(n))) return Number(n);
  return 0;
}
