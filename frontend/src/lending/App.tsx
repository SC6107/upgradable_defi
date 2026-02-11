import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { MarketsTable } from './components/MarketsTable';
import { UserPositions } from './components/UserPositions';
import { ActionModal } from './components/ActionModal';
import { useMarkets, useAccount, useWallet } from './hooks/useLending';
import API from './services/api';
import Web3Service from './services/web3';
import type { LendingMarket, LendingAction, UserPosition } from './types';
import { getMarketSupplyUsd, formatTvl, getPrice, getPositionBalance } from './utils';

const LENDING_TABS = ['markets', 'positions'] as const;
type LendingTab = (typeof LENDING_TABS)[number];

function useLendingTab(): LendingTab {
  const { pathname } = useLocation();
  const segment = pathname.replace(/^\/lending\/?/, '').split('/')[0] || 'markets';
  return LENDING_TABS.includes(segment as LendingTab) ? (segment as LendingTab) : 'markets';
}

function LendingApp() {
  const activeTab = useLendingTab();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [action, setAction] = useState<LendingAction>('supply');
  const [selectedMarket, setSelectedMarket] = useState<LendingMarket | null>(null);
  const [maxAmount, setMaxAmount] = useState('0');
  const [comptroller, setComptroller] = useState<string | null>(null);
  const [refetchError, setRefetchError] = useState<string | null>(null);
  const [needsManualRefresh, setNeedsManualRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const postTxRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    markets,
    loading: marketsLoading,
    error: marketsError,
    refetch: refetchMarkets,
  } = useMarkets();
  const {
    account,
    isConnected,
    chainId,
    isWrongNetwork,
    expectedChainId,
    expectedNetwork,
    switchingNetwork,
    connect,
    disconnect,
    switchNetwork,
  } = useWallet();
  const { account: accountData, loading: accountLoading, refetch: refetchAccount } = useAccount(account);

  useEffect(() => {
    API.getContractAddresses().then((r) => setComptroller(r.comptroller ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (postTxRefreshTimerRef.current) {
        clearTimeout(postTxRefreshTimerRef.current);
        postTxRefreshTimerRef.current = null;
      }
    };
  }, []);

  // Refetch account when user switches to Positions tab so list is in sync with markets
  useEffect(() => {
    if (activeTab === 'positions' && account) refetchAccount();
  }, [activeTab, account, refetchAccount]);

  const openModal = (market: LendingMarket, a: LendingAction, max: string) => {
    setSelectedMarket(market);
    setAction(a);
    setMaxAmount(max);
    setModalOpen(true);
  };

  const handleSupply = async (market: LendingMarket) => {
    let max = '0';
    if (isConnected && account) {
      try {
        const balance = await Web3Service.getUnderlyingBalance(market.underlying);
        const parsed = Number(balance);
        max = Number.isFinite(parsed) && parsed > 0 ? balance : '0';
      } catch {
        // Keep max as 0 when balance read fails.
      }
    }
    openModal(market, 'supply', max);
  };
  const handleBorrow = (market: LendingMarket) => {
    const availableUsd = accountData?.availableToBorrow ?? 0;
    const price = getPrice(market);
    const maxToken = price > 0 ? availableUsd / price : 0;
    openModal(market, 'borrow', String(maxToken));
  };
  const handleWithdraw = (position: UserPosition) => {
    const market = markets.find((m) => m.market?.toLowerCase() === position.market?.toLowerCase());
    if (market) openModal(market, 'withdraw', String(getPositionBalance(position, 'supplyUnderlying')));
  };
  const handleRepay = (position: UserPosition) => {
    const market = markets.find((m) => m.market?.toLowerCase() === position.market?.toLowerCase());
    if (market) openModal(market, 'repay', String(getPositionBalance(position, 'borrowBalance')));
  };

  const refetch = useCallback(async () => {
    setRefetchError(null);
    setRefreshing(true);
    try {
      await refetchMarkets();
      if (account) await refetchAccount();
      setNeedsManualRefresh(false);
      return true;
    } catch (e) {
      setRefetchError(e instanceof Error ? e.message : 'Failed to refresh data');
      setNeedsManualRefresh(true);
      return false;
    } finally {
      setRefreshing(false);
    }
  }, [account, refetchMarkets, refetchAccount]);

  const handleModalSuccess = async () => {
    setRefetchError(null);
    if (action === 'supply' || action === 'borrow') navigate('/lending/positions');
    setNeedsManualRefresh(true);
    const refreshed = await refetch();
    if (refreshed) {
      if (postTxRefreshTimerRef.current) clearTimeout(postTxRefreshTimerRef.current);
      postTxRefreshTimerRef.current = setTimeout(() => {
        void refetch();
        postTxRefreshTimerRef.current = null;
      }, 2500);
    }
  };

  // TVL = sum of each market's total supply in USD (backend sends totalSupplyUsd in plain USD)
  const totalTVL = markets.reduce((sum, m) => sum + getMarketSupplyUsd(m), 0);
  const avgSupply = markets.length ? markets.reduce((s, m) => s + (m.supplyRatePerYear ?? 0), 0) / markets.length : 0;
  const avgBorrow = markets.length ? markets.reduce((s, m) => s + (m.borrowRatePerYear ?? 0), 0) / markets.length : 0;
  const pct = (n: number) => (n < 1 ? n * 100 : n).toFixed(2);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header
        account={account}
        isConnected={isConnected}
        chainId={chainId}
        isWrongNetwork={isWrongNetwork}
        expectedChainId={expectedChainId}
        expectedNetwork={expectedNetwork}
        onSwitchNetwork={switchNetwork}
        switchingNetwork={switchingNetwork}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {isConnected && isWrongNetwork && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-amber-200 text-sm">
            <span>
              Wallet is on chain {chainId}. Please switch to {expectedNetwork} (chain {expectedChainId}).
            </span>
            <button
              type="button"
              onClick={switchNetwork}
              disabled={switchingNetwork}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {switchingNetwork ? 'Switching...' : `Switch to ${expectedNetwork}`}
            </button>
          </div>
        )}
        {refetchError && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-amber-200 text-sm">
            <span>{refetchError}. Please click Refresh to retry.</span>
            <button
              type="button"
              onClick={refetch}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-500"
            >
              Refresh
            </button>
          </div>
        )}
        {needsManualRefresh && !refetchError && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-teal-700/50 bg-teal-950/30 px-4 py-3 text-teal-200 text-sm">
            <span>Updating balances automatically after your transaction. You can also refresh now.</span>
            <button
              type="button"
              onClick={refetch}
              disabled={refreshing}
              className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 font-medium text-white hover:bg-teal-500"
            >
              {refreshing ? 'Refreshing...' : 'Refresh now'}
            </button>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4">
            <div className="text-xs text-zinc-500">TVL</div>
            <div className="mt-0.5 text-2xl font-semibold text-white">
              {formatTvl(totalTVL)}
            </div>
            <button
              type="button"
              onClick={refetch}
              disabled={refreshing}
              className="mt-2 text-xs text-zinc-500 underline hover:text-zinc-300"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4">
            <div className="text-xs text-zinc-500">Avg Supply APY</div>
            <div className="mt-0.5 text-2xl font-semibold text-emerald-400">{pct(avgSupply)}%</div>
          </div>
          <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4">
            <div className="text-xs text-zinc-500">Avg Borrow APY</div>
            <div className="mt-0.5 text-2xl font-semibold text-amber-400">{pct(avgBorrow)}%</div>
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'markets' && (
            <section>
              <h2 className="mb-4 text-xl font-semibold text-white">Lending Markets</h2>
              <MarketsTable
                markets={markets}
                loading={marketsLoading}
                error={marketsError}
                onRetry={refetch}
                onSupply={handleSupply}
                onBorrow={handleBorrow}
              />
            </section>
          )}

          {activeTab === 'positions' && (
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">My Positions</h2>
                <button
                  type="button"
                  onClick={refetch}
                  disabled={refreshing}
                  className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <UserPositions
                account={accountData}
                loading={accountLoading}
                connected={isConnected}
                markets={markets}
                onBorrow={handleBorrow}
                onWithdraw={handleWithdraw}
                onRepay={handleRepay}
                comptrollerAddress={comptroller}
                onRefetch={refetchAccount}
              />
            </section>
          )}

        </div>
      </main>

      <ActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        action={action}
        market={selectedMarket}
        onSuccess={handleModalSuccess}
        maxAmount={maxAmount}
      />
    </div>
  );
}

export default LendingApp;
