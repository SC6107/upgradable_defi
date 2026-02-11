import { NavLink } from 'react-router-dom';
import { WalletStatus } from '@/shared/components/WalletStatus';

type Props = {
  account: string | null;
  isConnected: boolean;
  chainId: number | null;
  isWrongNetwork: boolean;
  expectedChainId: number;
  expectedNetwork: string;
  onSwitchNetwork: () => void;
  switchingNetwork: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
};

const TABS: { path: string; label: string }[] = [
  { path: '/lending/markets', label: 'Markets' },
  { path: '/lending/positions', label: 'Positions' },
];

export function Header({
  account,
  isConnected,
  chainId,
  isWrongNetwork,
  expectedChainId,
  expectedNetwork,
  onSwitchNetwork,
  switchingNetwork,
  onConnect,
  onDisconnect,
}: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-700/80 bg-zinc-900/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <NavLink to="/lending/markets" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 font-semibold">
            ◈
          </div>
          <span className="text-lg font-semibold text-white">Lending</span>
        </NavLink>

        <nav className="flex gap-0.5">
          {TABS.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <WalletStatus
          account={account}
          isConnected={isConnected}
          chainId={chainId}
          isWrongNetwork={isWrongNetwork}
          expectedChainId={expectedChainId}
          expectedNetwork={expectedNetwork}
          switchingNetwork={switchingNetwork}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onSwitchNetwork={onSwitchNetwork}
        />
      </div>
    </header>
  );
}
