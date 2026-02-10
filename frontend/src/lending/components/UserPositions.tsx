/**
 * User Positions Component
 * Displays user's supply and borrow positions
 */
import React, { useState } from 'react';
import type { AccountData, UserPosition } from '../types';
import Web3Service from '../services/web3';

interface UserPositionsProps {
  account: AccountData | null;
  loading: boolean;
  connected: boolean;
  onWithdraw: (position: UserPosition) => void;
  onRepay: (position: UserPosition) => void;
  /** When set, show "Enable as collateral" if liquidity is 0 but user has supply (enter markets once) */
  comptrollerAddress?: string | null;
  onRefetch?: () => void;
}

export const UserPositions: React.FC<UserPositionsProps> = ({
  account,
  loading,
  connected,
  onWithdraw,
  onRepay,
  comptrollerAddress,
  onRefetch,
}) => {
  const [entering, setEntering] = useState(false);
  const handleEnterMarkets = async () => {
    if (!comptrollerAddress || !account || !onRefetch) return;
    const marketsWithSupply = account.positions.filter((p) => p.supplyUnderlying > 0).map((p) => p.market);
    if (marketsWithSupply.length === 0) return;
    setEntering(true);
    try {
      await Web3Service.enterMarkets(comptrollerAddress, marketsWithSupply);
      await onRefetch();
    } finally {
      setEntering(false);
    }
  };
  if (!connected) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <p className="text-gray-400">Please connect wallet first</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-400">Loading positions...</p>
      </div>
    );
  }

  if (!account || account.positions.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <p className="text-gray-400">No positions found</p>
      </div>
    );
  }

  const supplyPositions = account.positions.filter((p) => p.supplyUnderlying > 0);
  const borrowPositions = account.positions.filter((p) => p.borrowBalance > 0);

  return (
    <div className="space-y-6">
      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-gray-400 text-sm mb-1">Total Supplied</div>
          <div className="text-2xl font-bold text-white">
            ${account.totalSupplied.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-gray-400 text-sm mb-1">Total Borrowed</div>
          <div className="text-2xl font-bold text-white">
            ${account.totalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-gray-400 text-sm mb-1">Borrow Limit</div>
          <div className="text-2xl font-bold text-white">
            ${account.borrowLimit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-gray-400 text-sm mb-1">Account Health</div>
          <div className={`text-2xl font-bold ${account.isHealthy ? 'text-green-400' : 'text-red-400'}`}>
            {account.isHealthy ? 'Healthy' : 'At Risk'}
          </div>
        </div>
      </div>

      {/* Hint: enter markets so supply counts as collateral (liquidity) */}
      {supplyPositions.length > 0 && comptrollerAddress && onRefetch && (account.liquidity === 0 || (account as { liquidityUsd?: number }).liquidityUsd === 0) && (
        <div className="p-4 rounded-lg bg-amber-900/30 border border-amber-700 text-amber-200 text-sm flex items-center justify-between gap-4">
          <span>Your supply is not yet used as collateral. Enable it to borrow against your deposits and see Borrow Limit / Liquidity.</span>
          <button
            type="button"
            onClick={handleEnterMarkets}
            disabled={entering}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium whitespace-nowrap"
          >
            {entering ? '...' : 'Enable as collateral'}
          </button>
        </div>
      )}

      {/* Supply Positions */}
      {supplyPositions.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">Supply Positions</h3>
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Asset</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Balance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Value (USD)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">APY</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Collateral Factor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {supplyPositions.map((position) => {
                  const price = position.price ?? (position as { priceUsd?: number }).priceUsd ?? 0;
                  const valueUSD = (position.supplyUnderlying ?? 0) * price;
                  const balance = (position.supplyUnderlying ?? 0).toFixed(4);
                  
                  return (
                    <tr key={position.market} className="hover:bg-slate-750">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{position.symbol}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-white">
                        {balance}
                      </td>
                      <td className="px-6 py-4 text-right text-white">
                        ${valueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-green-400">
                        {((position.supplyAPY ?? (position as { supplyRatePerYear?: number }).supplyRatePerYear ?? 0) * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-right text-gray-300">
                        {((position.collateralFactor ?? 0) * 100).toFixed(0)}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onWithdraw(position)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                        >
                          Withdraw
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Borrow Positions */}
      {borrowPositions.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">Borrow Positions</h3>
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Asset</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Borrowed</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Value (USD)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">APY</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {borrowPositions.map((position) => {
                  const price = position.price ?? (position as { priceUsd?: number }).priceUsd ?? 0;
                  const valueUSD = (position.borrowBalance ?? 0) * price;
                  const balance = (position.borrowBalance ?? 0).toFixed(4);
                  
                  return (
                    <tr key={position.market} className="hover:bg-slate-750">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{position.symbol}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-white">
                        {balance}
                      </td>
                      <td className="px-6 py-4 text-right text-white">
                        ${valueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-yellow-400">
                        {((position.borrowAPY ?? (position as { borrowRatePerYear?: number }).borrowRatePerYear ?? 0) * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onRepay(position)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                        >
                          Repay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
