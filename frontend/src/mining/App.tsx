import { Header } from './components/Header';
import { StakeRewards } from './components/StakeRewards';
import { useHealth } from '@/shared/hooks/useAPI';
import { useWallet } from '@/shared/hooks/useWallet';
import Web3Service from './services/web3';

function MiningApp() {
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
  const { health } = useHealth();

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

        <div className="space-y-8">
          <div>
            <StakeRewards
              account={walletAccount}
              isConnected={isConnected}
            />
          </div>
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
