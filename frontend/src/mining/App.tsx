import { useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { PoolsTable } from './components/PoolsTable';
import { StakeRewards } from './components/StakeRewards';
import { UserPortfolio } from './components/UserPortfolio';
import { StatCard } from './components/StatCard';
import { useMarkets, useHealth } from '@/shared/hooks/useAPI';
import { useWallet } from '@/shared/hooks/useWallet';
import { useAccount } from './hooks/useAPI';
import Web3Service from './services/web3';

const MINING_TABS = ['pools', 'portfolio', 'stake'] as const;
type MiningTab = (typeof MINING_TABS)[number];

function useMiningTab(): MiningTab {
  const { pathname } = useLocation();
  const segment = pathname.replace(/^\/mining\/?/, '').split('/')[0] || 'pools';
  return MINING_TABS.includes(segment as MiningTab) ? (segment as MiningTab) : 'pools';
}

function MiningApp() {
  const activeTab = useMiningTab();
  const { markets, loading: marketsLoading } = useMarkets();
  const {
    account: walletAccount,
    isConnected,
    chainId,
    isWrongNetwork,
    expectedNetwork,
    expectedChainId,
    switchingNetwork,
    loading: walletLoading,
    connect,
    disconnect,
    switchNetwork,
  } = useWallet(Web3Service);
  const { account, loading: accountLoading } = useAccount(walletAccount || null);
  const { health } = useHealth();

  const totalTVL = markets.reduce((sum, market) => {
    const supply = market.totalSupply || 0;
    const price = market.price || 0;
    const decimals = market.decimals || 18;
    const tvl = (supply * price) / (10 ** (decimals + 8));
    return sum + tvl;
  }, 0);

  const avgSupplyAPR =
    markets.length > 0
      ? markets.reduce((sum, m) => sum + (m.supplyRatePerYear || 0), 0) / markets.length
      : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <Header
        account={walletAccount}
        isConnected={isConnected}
        chainId={chainId}
        loading={walletLoading}
        switchingNetwork={switchingNetwork}
        isWrongNetwork={isWrongNetwork}
        expectedNetwork={expectedNetwork}
        expectedChainId={expectedChainId}
        onConnect={connect}
        onDisconnect={disconnect}
        onSwitchNetwork={switchNetwork}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {isConnected && isWrongNetwork && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-amber-200 text-sm">
            <span>
              Wallet is on chain {chainId}. Please switch to {expectedNetwork} (chain{' '}
              {expectedChainId}).
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total TVL"
              value={`$${(totalTVL / 1e6).toFixed(2)}`}
              unit="M"
              change={{ value: 4.07, isPositive: true }}
            />
            <StatCard
              label="Available Pools"
              value={markets.length}
              change={{ value: 0, isPositive: true }}
            />
            <StatCard
              label="Average Supply APR"
              value={`${(avgSupplyAPR * 100).toFixed(2)}`}
              unit="%"
            />
            {health && (
              <StatCard
                label="Indexed to Block"
                value={health.indexedToBlock}
                change={{
                  value: health.latestBlock - health.indexedToBlock,
                  isPositive: true,
                }}
              />
            )}
        </div>

        <div className="space-y-8">
          {activeTab === 'pools' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-3xl font-bold">Liquidity Pools</h2>
                <div className="text-sm text-gray-400">
                  {markets.length} pools available
                </div>
              </div>
              <PoolsTable markets={markets} loading={marketsLoading} />
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Your Portfolio</h2>
              <UserPortfolio
                account={account}
                loading={accountLoading}
                connected={isConnected}
              />
            </div>
          )}

          {activeTab === 'stake' && (
            <div>
              <StakeRewards
                account={walletAccount}
                isConnected={isConnected}
              />
            </div>
          )}

        </div>
      </main>

      <footer className="mt-auto border-t border-slate-700 text-center text-gray-400 text-sm py-6">
        {health && (
          <p>
            Chain ID: {health.chainId} • Latest Block: {health.latestBlock}
          </p>
        )}
      </footer>
    </div>
  );
}

export default MiningApp;
