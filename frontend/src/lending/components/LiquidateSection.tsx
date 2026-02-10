/**
 * Liquidate Section
 * UI for liquidators to repay underwater borrowers and seize collateral.
 */
import React, { useState } from 'react';
import type { LendingMarket } from '../types';
import Web3Service from '../services/web3';

interface LiquidateSectionProps {
  markets: LendingMarket[];
  isConnected: boolean;
  onSuccess?: () => void;
}

export const LiquidateSection: React.FC<LiquidateSectionProps> = ({
  markets,
  isConnected,
  onSuccess,
}) => {
  const [borrower, setBorrower] = useState('');
  const [repayMarket, setRepayMarket] = useState<LendingMarket | null>(null);
  const [collateralMarket, setCollateralMarket] = useState<LendingMarket | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);
    if (!repayMarket || !collateralMarket || !amount || !borrower.trim()) {
      setError('请填写借款人地址、偿还市场、抵押品市场与金额');
      return;
    }

    setLoading(true);
    try {
      const hash = await Web3Service.liquidateBorrow(
        repayMarket.market,
        borrower.trim(),
        amount,
        collateralMarket.market,
        repayMarket.underlying ?? ''
      );
      setTxHash(hash);
      setAmount('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '清算失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
        <p className="text-gray-400">请先连接钱包后再执行清算。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">清算 (Liquidate)</h2>
        <p className="text-gray-400 text-sm">
          为不健康头寸偿还部分债务，并按清算激励获得借款人的抵押品。请确保借款人已处于 shortfall &gt; 0（不健康）状态。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">借款人地址 (Borrower)</label>
          <input
            type="text"
            value={borrower}
            onChange={(e) => setBorrower(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">偿还市场 (Repay this debt)</label>
          <select
            value={repayMarket?.market ?? ''}
            onChange={(e) => setRepayMarket(markets.find((m) => m.market === e.target.value) ?? null)}
            className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
          >
            <option value="">选择市场</option>
            {markets.map((m) => (
              <option key={m.market} value={m.market}>
                {(m.symbol ?? '') + ' (' + (m.market?.slice(0, 8) ?? '') + '...)'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">偿还数量 (Repay amount)</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">没收抵押品市场 (Seize collateral)</label>
          <select
            value={collateralMarket?.market ?? ''}
            onChange={(e) => setCollateralMarket(markets.find((m) => m.market === e.target.value) ?? null)}
            className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
          >
            <option value="">选择市场</option>
            {markets.map((m) => (
              <option key={m.market} value={m.market}>
                {(m.symbol ?? '') + ' (' + (m.market?.slice(0, 8) ?? '') + '...)'}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {txHash && <p className="text-green-400 text-sm">交易已发送: {txHash.slice(0, 10)}...</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium"
        >
          {loading ? '提交中...' : '执行清算'}
        </button>
      </form>
    </div>
  );
};
