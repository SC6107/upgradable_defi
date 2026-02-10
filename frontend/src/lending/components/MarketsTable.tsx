/**
 * Markets Table Component
 * Displays all available lending markets with supply/borrow actions
 */
import React, { useState } from 'react';
import type { LendingMarket } from '../types';

interface MarketsTableProps {
  markets: LendingMarket[];
  loading: boolean;
  onSupply: (market: LendingMarket) => void;
  onBorrow: (market: LendingMarket) => void;
}

export const MarketsTable: React.FC<MarketsTableProps> = ({
  markets,
  loading,
  onSupply,
  onBorrow,
}) => {
  const [sortBy, setSortBy] = useState<'symbol' | 'totalSupply' | 'supplyAPY' | 'borrowAPY'>('symbol');
  const [sortDesc, setSortDesc] = useState(false);

  const handleSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
  };

  const sortedMarkets = [...markets].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    const decA = a.decimals ?? 18;
    const decB = b.decimals ?? 18;
    const priceA = a.price ?? (a as { priceUsd?: number }).priceUsd ?? 0;
    const priceB = b.price ?? (b as { priceUsd?: number }).priceUsd ?? 0;
    const supplyA = a.totalSupply ?? (a as { totalSupplyUnderlying?: number }).totalSupplyUnderlying ?? 0;
    const supplyB = b.totalSupply ?? (b as { totalSupplyUnderlying?: number }).totalSupplyUnderlying ?? 0;

    switch (sortBy) {
      case 'symbol':
        aVal = a.symbol ?? '';
        bVal = b.symbol ?? '';
        break;
      case 'totalSupply':
        aVal = priceA && supplyA != null ? (supplyA * priceA) / (10 ** (decA + 8)) : 0;
        bVal = priceB && supplyB != null ? (supplyB * priceB) / (10 ** (decB + 8)) : 0;
        break;
      case 'supplyAPY':
        aVal = (a as { supplyAprPct?: number }).supplyAprPct ?? a.supplyRatePerYear ?? 0;
        bVal = (b as { supplyAprPct?: number }).supplyAprPct ?? b.supplyRatePerYear ?? 0;
        break;
      case 'borrowAPY':
        aVal = (a as { borrowAprPct?: number }).borrowAprPct ?? a.borrowRatePerYear ?? 0;
        bVal = (b as { borrowAprPct?: number }).borrowAprPct ?? b.borrowRatePerYear ?? 0;
        break;
      default:
        return 0;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }
    const an = Number(aVal);
    const bn = Number(bVal);
    return sortDesc ? bn - an : an - bn;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
          <p className="text-gray-400">Loading markets...</p>
        </div>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No markets available</p>
      </div>
    );
  }

  const hasAnyChainData = markets.some(
    (m) => m.symbol != null || m.totalSupply != null || m.price != null
  );

  return (
    <div>
      {!hasAnyChainData && (
        <div className="mb-4 p-4 rounded-lg bg-amber-900/30 border border-amber-700 text-amber-200 text-sm">
          Chain data is missing (symbol, rates, price are empty). Ensure Anvil is running and contracts are deployed for the addresses in use; then restart the backend.
        </div>
      )}
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th
                className="text-left px-6 py-4 font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center gap-2">
                  Asset
                  {sortBy === 'symbol' && (
                    <span className="text-pink-500">{sortDesc ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th
                className="text-right px-6 py-4 font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('totalSupply')}
              >
                <div className="flex items-center justify-end gap-2">
                  Total Supply
                  {sortBy === 'totalSupply' && (
                    <span className="text-pink-500">{sortDesc ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="text-right px-6 py-4 font-semibold text-gray-300">
                Total Borrow
              </th>
              <th
                className="text-right px-6 py-4 font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('supplyAPY')}
              >
                <div className="flex items-center justify-end gap-2">
                  Supply APY
                  {sortBy === 'supplyAPY' && (
                    <span className="text-pink-500">{sortDesc ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th
                className="text-right px-6 py-4 font-semibold text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('borrowAPY')}
              >
                <div className="flex items-center justify-end gap-2">
                  Borrow APY
                  {sortBy === 'borrowAPY' && (
                    <span className="text-pink-500">{sortDesc ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="text-right px-6 py-4 font-semibold text-gray-300">
                Utilization
              </th>
              <th className="text-center px-6 py-4 font-semibold text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {sortedMarkets.map((market) => {
              const symbol = market.symbol ?? '—';
              const marketAddr = market.market ?? '';
              const decimals = market.decimals ?? 18;
              const price = market.price ?? (market as { priceUsd?: number }).priceUsd ?? 0;
              const totalSupply = market.totalSupply ?? (market as { totalSupplyUnderlying?: number }).totalSupplyUnderlying ?? 0;
              const totalBorrows = market.totalBorrows ?? (market as { totalBorrowsUnderlying?: number }).totalBorrowsUnderlying ?? 0;
              const totalSupplyUSD = price && totalSupply != null
                ? (totalSupply * price) / (10 ** (decimals + 8))
                : (market as { totalSupplyUsd?: number }).totalSupplyUsd ?? 0;
              const totalBorrowsUSD = price && totalBorrows != null
                ? (totalBorrows * price) / (10 ** (decimals + 8))
                : (market as { totalBorrowsUsd?: number }).totalBorrowsUsd ?? 0;
              const supplyApr = (market as { supplyAprPct?: number }).supplyAprPct ?? market.supplyRatePerYear;
              const borrowApr = (market as { borrowAprPct?: number }).borrowAprPct ?? market.borrowRatePerYear;
              const supplyAPY = supplyApr != null ? (supplyApr < 1 ? supplyApr * 100 : supplyApr).toFixed(2) : '0.00';
              const borrowAPY = borrowApr != null ? (borrowApr < 1 ? borrowApr * 100 : borrowApr).toFixed(2) : '0.00';
              const util = market.utilization ?? 0;
              const utilization = (typeof util === 'number' ? util * 100 : 0).toFixed(2);
              const symbolDisplay = symbol.length >= 2 ? symbol.substring(0, 2) : (marketAddr ? marketAddr.slice(2, 4) : '—');

              return (
                <tr key={marketAddr || symbol} className="hover:bg-slate-750">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {symbolDisplay}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">
                          {symbol}
                        </div>
                        <div className="text-xs text-gray-400">
                          {marketAddr ? `${marketAddr.substring(0, 8)}...` : '—'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-white">
                      ${totalSupplyUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-white">
                      ${totalBorrowsUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-green-400">
                      {supplyAPY}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-yellow-400">
                      {borrowAPY}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(100, parseFloat(utilization))}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-300 w-12">
                        {utilization}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => onSupply(market)}
                        className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm rounded-lg transition-colors font-medium"
                      >
                        Supply
                      </button>
                      <button
                        onClick={() => onBorrow(market)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors font-medium"
                      >
                        Borrow
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
};
