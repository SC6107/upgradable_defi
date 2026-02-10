/** Shared helpers for lending UI. Backend returns human-readable numbers (price, supplyUnderlying, etc.). */

export function formatPct(value: number | undefined | null): string {
  const n = value != null ? Number(value) : 0;
  if (!Number.isFinite(n)) return '0.00';
  return (n < 1 ? n * 100 : n).toFixed(2);
}

export function getPrice(p: { price?: number; priceUsd?: number }): number {
  return p.price ?? p.priceUsd ?? 0;
}

export function formatUsd(n: number): string {
  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function shortAddress(addr: string): string {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
}
