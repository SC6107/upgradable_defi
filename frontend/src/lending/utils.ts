/**
 * Shared helpers for lending UI.
 *
 * Unit convention (API / backend):
 * - Balance: human token amount (e.g. 100000 WETH)
 * - Price: USD per token (e.g. 2000)
 * - Value USD: balance × price, plain USD (e.g. 200000000)
 * - Rates: decimal (0.05 = 5%) or percentage (5.25); formatPct handles both
 */

export function formatPct(value: number | undefined | null): string {
  const n = value != null ? Number(value) : 0;
  if (!Number.isFinite(n)) return '0.00';
  return (n < 1 ? n * 100 : n).toFixed(2);
}

export function getPrice(p: { price?: number; priceUsd?: number }): number {
  return p.price ?? p.priceUsd ?? 0;
}

type RateSource = Record<string, unknown> & {
  supplyRatePerYear?: number;
  borrowRatePerYear?: number;
  supplyAprPct?: number;
  borrowAprPct?: number;
  supplyAPY?: number;
  borrowAPY?: number;
  supply_rate_per_year?: number;
  borrow_rate_per_year?: number;
};

/**
 * Get supply APY from a market or position. Same field order as Markets table.
 * Prefers supplyAprPct (percentage e.g. 5.25), then supplyRatePerYear (decimal e.g. 0.0525).
 * Optional fallback: if item has no valid value, use marketFallback (e.g. for Positions using markets list).
 */
export function getSupplyApy(item: RateSource, marketFallback?: RateSource | null): number | undefined {
  const raw =
    item.supplyAprPct ??
    item.supplyRatePerYear ??
    item.supplyAPY ??
    (item as Record<string, unknown>).supply_rate_per_year;
  const n = raw != null ? Number(raw) : undefined;
  if (n != null && Number.isFinite(n)) return n;
  if (marketFallback) {
    const fromM =
      marketFallback.supplyAprPct ??
      marketFallback.supplyRatePerYear ??
      (marketFallback as Record<string, unknown>).supply_rate_per_year;
    const nm = fromM != null ? Number(fromM) : undefined;
    if (nm != null && Number.isFinite(nm)) return nm;
  }
  return undefined;
}

/**
 * Get borrow APY from a market or position. Same field order as Markets table.
 */
export function getBorrowApy(item: RateSource, marketFallback?: RateSource | null): number | undefined {
  const raw =
    item.borrowAprPct ??
    item.borrowRatePerYear ??
    item.borrowAPY ??
    (item as Record<string, unknown>).borrow_rate_per_year;
  const n = raw != null ? Number(raw) : undefined;
  if (n != null && Number.isFinite(n)) return n;
  if (marketFallback) {
    const fromM =
      marketFallback.borrowAprPct ??
      marketFallback.borrowRatePerYear ??
      (marketFallback as Record<string, unknown>).borrow_rate_per_year;
    const nm = fromM != null ? Number(fromM) : undefined;
    if (nm != null && Number.isFinite(nm)) return nm;
  }
  return undefined;
}

/**
 * Supply (or borrow) value in USD for a market. Prefers backend totalSupplyUsd (plain USD);
 * falls back to totalSupply (human token amount) * price only when totalSupplyUsd is missing.
 * Handles both camelCase and snake_case from API.
 */
export function getMarketSupplyUsd(m: {
  totalSupplyUsd?: number;
  total_supply_usd?: number;
  totalSupply?: number;
  totalSupplyUnderlying?: number;
  price?: number;
  priceUsd?: number;
}): number {
  const usd =
    (m as { totalSupplyUsd?: number }).totalSupplyUsd ??
    (m as { total_supply_usd?: number }).total_supply_usd;
  if (usd != null && Number.isFinite(usd)) return usd;
  const supply = (m.totalSupply ?? (m as { totalSupplyUnderlying?: number }).totalSupplyUnderlying) ?? 0;
  const price = getPrice(m);
  return supply * price;
}

/**
 * Format TVL in millions (M). Value is expected in plain USD (e.g. 200000000 for $200M).
 */
export function formatTvl(usd: number): string {
  if (!Number.isFinite(usd) || usd < 0) return '$0.00M';
  return `$${(usd / 1e6).toFixed(2)}M`;
}

export function formatUsd(n: number): string {
  const num = Number(n);
  if (num == null || !Number.isFinite(num) || num < 0) return '$0.00';
  return '$' + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Format USD: use millions (M) when >= 1e6, else plain USD. Input must be plain USD. */
export function formatUsdAuto(usd: number): string {
  const num = Number(usd);
  if (num == null || !Number.isFinite(num) || num < 0) return '$0.00';
  return num >= 1e6 ? formatTvl(num) : formatUsd(num);
}

export function shortAddress(addr: string): string {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
}

/** Read position balance (supply or borrow); handles both camelCase and snake_case from API. */
export function getPositionBalance(
  p: Record<string, unknown>,
  key: 'supplyUnderlying' | 'borrowBalance'
): number {
  const camel = p[key];
  const snake = p[key === 'supplyUnderlying' ? 'supply_underlying' : 'borrow_balance'];
  const n = camel ?? snake;
  if (n != null && Number.isFinite(Number(n))) return Number(n);
  return 0;
}
