/**
 * Stake & Rewards
 * Script-aligned flow:
 * 1) supply underlying -> mint dToken
 * 2) stake dToken into LiquidityMining
 * 3) wait and claim GOV rewards
 */
import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import API from '../services/api';
import Web3Service from '../services/web3';
import { TARGET_NETWORK } from '@/config/network';
import type { TxSubmittedInfo } from '@/shared/services/web3Base';
import type {
  LiquidityMiningAccountSummary,
  LiquidityMiningPool,
} from '../services/api';
import { formatAddress } from '@/shared/utils/format';

interface StakeRewardsProps {
  account: string | null;
  isConnected: boolean;
  onSuccess?: () => void;
}

type NoticeType = 'success' | 'error';
type Notice = {
  type: NoticeType;
  title: string;
  message: string;
  txHashes?: string[];
};

const isPositiveNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

const formatToken = (value: number | null | undefined, digits: number = 6): string => {
  if (value === null || value === undefined) return '-';
  return value.toFixed(digits);
};

const toInputAmount = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 18 });
};

const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || seconds <= 0) return '-';
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  const minutes = Math.floor(seconds / 60);
  return `${Math.max(minutes, 1)} min`;
};

const formatTime = (timestamp: number | null | undefined): string => {
  if (timestamp === null || timestamp === undefined || timestamp <= 0) return '-';
  return new Date(timestamp * 1000).toLocaleString();
};

const addressExplorerUrl = (address: string): string => {
  const base = TARGET_NETWORK.explorerUrl ?? 'https://sepolia.etherscan.io';
  return `${base}/address/${address}`;
};

export function StakeRewards({
  account,
  isConnected,
  onSuccess,
}: StakeRewardsProps) {
  const [pools, setPools] = useState<LiquidityMiningPool[]>([]);
  const [accountSummary, setAccountSummary] = useState<LiquidityMiningAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stakeAmounts, setStakeAmounts] = useState<Record<string, string>>({});
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<string, string>>({});
  const [walletStakingBalances, setWalletStakingBalances] = useState<Record<string, number | null>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [processingTx, setProcessingTx] = useState<TxSubmittedInfo | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [poolsRes, accountRes] = await Promise.all([
        API.getLiquidityMining(),
        account ? API.getLiquidityMiningAccount(account) : Promise.resolve(null),
      ]);

      setPools(poolsRes);
      setAccountSummary(accountRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load liquidity mining');
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const refreshWalletStakingBalances = async () => {
      if (!isConnected || !account || pools.length === 0) {
        setWalletStakingBalances({});
        return;
      }

      const entries = await Promise.all(
        pools.map(async (pool): Promise<[string, number | null]> => {
          if (!pool.stakingToken) return [pool.mining, null];

          try {
            const balanceRaw = await Web3Service.getTokenBalance(pool.stakingToken);
            const decimals = pool.stakingDecimals ?? 18;
            const balance = parseFloat(ethers.formatUnits(balanceRaw, decimals));
            if (!Number.isFinite(balance)) return [pool.mining, null];
            return [pool.mining, balance];
          } catch {
            return [pool.mining, null];
          }
        })
      );

      setWalletStakingBalances(Object.fromEntries(entries));
    };

    void refreshWalletStakingBalances();
  }, [account, isConnected, pools]);

  const getPosition = useCallback((miningAddress: string) => {
    if (!accountSummary) return null;
    return (
      accountSummary.positions.find(
        (position) => position.mining.toLowerCase() === miningAddress.toLowerCase()
      ) ?? null
    );
  }, [accountSummary]);

  const runAction = useCallback(async (
    actionKey: string,
    run: () => Promise<{ title: string; message: string; txHashes: string[] }>
  ) => {
    setPendingAction(actionKey);
    setError(null);
    setNotice(null);
    setProcessingTx(null);

    try {
      const result = await run();
      setNotice({
        type: 'success',
        title: result.title,
        message: result.message,
        txHashes: result.txHashes,
      });
      await fetchData();
      onSuccess?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Transaction failed';
      setNotice({
        type: 'error',
        title: 'Transaction failed',
        message,
      });
    } finally {
      setProcessingTx(null);
      setPendingAction(null);
    }
  }, [fetchData, onSuccess]);

  const handleStake = async (pool: LiquidityMiningPool) => {
    const amount = stakeAmounts[pool.mining] ?? '';
    if (!isPositiveNumber(amount)) return;

    await runAction(`stake:${pool.mining}`, async () => {
      const txHash = await Web3Service.stake(pool.mining, amount, setProcessingTx);
      setStakeAmounts((prev) => ({ ...prev, [pool.mining]: '' }));
      return {
        title: 'Stake submitted',
        message: `Staked ${amount} ${pool.stakingSymbol ?? 'dToken'}.`,
        txHashes: [txHash],
      };
    });
  };

  const handleWithdraw = async (pool: LiquidityMiningPool) => {
    const amount = withdrawAmounts[pool.mining] ?? '';
    if (!isPositiveNumber(amount)) return;

    await runAction(`withdraw:${pool.mining}`, async () => {
      const txHash = await Web3Service.withdraw(pool.mining, amount, setProcessingTx);
      setWithdrawAmounts((prev) => ({ ...prev, [pool.mining]: '' }));
      return {
        title: 'Withdraw submitted',
        message: `Withdrew ${amount} ${pool.stakingSymbol ?? 'dToken'}.`,
        txHashes: [txHash],
      };
    });
  };

  const handleClaim = async (pool: LiquidityMiningPool) => {
    const position = getPosition(pool.mining);
    const earnedAmount = position?.earned ?? 0;
    await runAction(`claim:${pool.mining}`, async () => {
      const txHash = await Web3Service.getReward(pool.mining, setProcessingTx);
      return {
        title: 'Rewards claimed',
        message: `Claimed ${formatToken(earnedAmount, 6)} ${pool.rewardsSymbol ?? 'GOV'} rewards.`,
        txHashes: [txHash],
      };
    });
  };

  const handleExit = async (pool: LiquidityMiningPool) => {
    await runAction(`exit:${pool.mining}`, async () => {
      const txHash = await Web3Service.exit(pool.mining, setProcessingTx);
      return {
        title: 'Exit submitted',
        message: 'Withdrawn all staked tokens and claimed rewards.',
        txHashes: [txHash],
      };
    });
  };

  if (!isConnected) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
        <p className="text-gray-400">Connect wallet to use liquidity mining.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void fetchData()}
          className="mt-3 px-4 py-2 rounded-lg bg-slate-600 text-white text-sm hover:bg-slate-500"
        >
          Retry
        </button>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
        <p className="text-gray-400">No liquidity mining pools available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Liquidity Mining Rewards</h2>
        <p className="text-gray-400 text-sm">
          Stake dToken, let rewards accrue over time, then claim GOV rewards.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-slate-900/70 border border-slate-700 p-3">
            <p className="text-gray-400">Wallet</p>
            <p className="text-white font-medium">{account ? formatAddress(account, 5) : '-'}</p>
          </div>
          <div className="rounded-lg bg-slate-900/70 border border-slate-700 p-3">
            <p className="text-gray-400">{accountSummary?.govSymbol ?? 'GOV'} Balance</p>
            <p className="text-white font-medium">{formatToken(accountSummary?.govBalance, 6)}</p>
          </div>
          <div className="rounded-lg bg-slate-900/70 border border-slate-700 p-3">
            <p className="text-gray-400">Mining Positions</p>
            <p className="text-white font-medium">{accountSummary?.positions.length ?? 0}</p>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-lg border p-4 ${
            notice.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-900/20'
              : 'border-red-500/40 bg-red-900/20'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className={notice.type === 'success' ? 'text-emerald-300 font-semibold' : 'text-red-300 font-semibold'}>
              {notice.title}
            </p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 rounded-md border border-slate-500/60 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700/60"
            >
              Close
            </button>
          </div>
          <p className="text-sm text-slate-200 mt-1">{notice.message}</p>
          {notice.txHashes && notice.txHashes.length > 0 && (
            <div className="mt-3 space-y-1">
              {notice.txHashes.map((hash) => (
                <a
                  key={hash}
                  href={`${TARGET_NETWORK.explorerUrl ?? 'https://sepolia.etherscan.io'}/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-mono text-xs text-sky-300 hover:text-sky-200 underline break-all"
                >
                  {hash}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-5">
        {pools.map((pool) => {
          const position = getPosition(pool.mining);

          const staked = position?.stakedBalance ?? 0;
          const earned = position?.earned ?? 0;
          const pendingForPool = pendingAction?.endsWith(`:${pool.mining}`) ?? false;
          const stakeAmount = stakeAmounts[pool.mining] ?? '';
          const withdrawAmount = withdrawAmounts[pool.mining] ?? '';
          const walletStakingBalance = walletStakingBalances[pool.mining] ?? null;

          return (
            <div key={pool.mining} className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {pool.stakingSymbol ?? 'dToken'} → {pool.rewardsSymbol ?? 'GOV'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Mining:{' '}
                    {ethers.isAddress(pool.mining) ? (
                      <a
                        href={addressExplorerUrl(pool.mining)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-300 hover:text-sky-200 underline"
                      >
                        {formatAddress(pool.mining, 6)}
                      </a>
                    ) : (
                      formatAddress(pool.mining, 6)
                    )}
                  </p>
                  {pool.stakingToken && (
                    <p className="text-xs text-gray-500 mt-1">
                      Staking token:{' '}
                      {ethers.isAddress(pool.stakingToken) ? (
                        <a
                          href={addressExplorerUrl(pool.stakingToken)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 hover:text-sky-200 underline"
                        >
                          {formatAddress(pool.stakingToken, 6)}
                        </a>
                      ) : (
                        formatAddress(pool.stakingToken, 6)
                      )}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Staked</p>
                    <p className="text-white font-medium">{formatToken(staked, 6)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Earned</p>
                    <p className="text-emerald-400 font-medium">{formatToken(earned, 6)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Staked</p>
                    <p className="text-white font-medium">{formatToken(pool.totalStaked, 4)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Reward Rate</p>
                    <p className="text-white font-medium">{formatToken(pool.rewardRate, 8)} / sec</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Duration</p>
                    <p className="text-white font-medium">{formatDuration(pool.rewardsDuration)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Period Finish</p>
                    <p className="text-white font-medium">{formatTime(pool.periodFinish)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-600 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-200 font-medium">Manual stake</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <p className="text-slate-400">
                      Wallet {pool.stakingSymbol ?? 'dToken'}: <span className="text-slate-200">{formatToken(walletStakingBalance, 6)}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setStakeAmounts((prev) => ({ ...prev, [pool.mining]: toInputAmount(walletStakingBalance) }))
                      }
                      disabled={walletStakingBalance === null || walletStakingBalance <= 0}
                      className="rounded px-2 py-1 text-[11px] font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmounts((prev) => ({ ...prev, [pool.mining]: e.target.value }))}
                      placeholder={`Amount of ${pool.stakingSymbol ?? 'dToken'}`}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handleStake(pool)}
                      disabled={pendingForPool || !isPositiveNumber(stakeAmount)}
                      className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-sm font-medium"
                    >
                      Stake
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-600 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-200 font-medium">Withdraw</p>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={withdrawAmount}
                      onChange={(e) =>
                        setWithdrawAmounts((prev) => ({ ...prev, [pool.mining]: e.target.value }))
                      }
                      placeholder={`Amount of ${pool.stakingSymbol ?? 'dToken'}`}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handleWithdraw(pool)}
                      disabled={pendingForPool || !isPositiveNumber(withdrawAmount)}
                      className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-sm font-medium"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-600 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-200 font-medium">Step 3: Claim Rewards</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleClaim(pool)}
                      disabled={pendingForPool || earned <= 0}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium"
                    >
                      Claim {pool.rewardsSymbol ?? 'GOV'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExit(pool)}
                      disabled={pendingForPool || staked <= 0}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {processingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-slate-600 bg-slate-900/95 p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-500 border-t-sky-400" />
              <p className="text-sm font-semibold text-sky-300">Transaction processing</p>
            </div>
            <p className="mt-3 text-sm text-slate-200">
              {processingTx.stage === 'approval'
                ? 'Signed approval. Waiting for confirmation on chain...'
                : 'Signed in MetaMask. Waiting for confirmation on chain...'}
            </p>
            <a
              href={`${TARGET_NETWORK.explorerUrl ?? 'https://sepolia.etherscan.io'}/tx/${processingTx.hash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block break-all font-mono text-xs text-sky-300 underline hover:text-sky-200"
            >
              {processingTx.hash}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
