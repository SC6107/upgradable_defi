import React from 'react';
import { NavLink } from 'react-router-dom';
import { WalletStatus } from '@/shared/components/WalletStatus';

const TABS: { path: string; label: string }[] = [
  { path: '/mining/pools', label: 'Pools' },
  { path: '/mining/portfolio', label: 'Portfolio' },
  { path: '/mining/stake', label: '⛏️ Stake GOV' },
];

type Props = {
  account: string | null;
  isConnected: boolean;
  chainId: number | null;
  loading: boolean;
  switchingNetwork: boolean;
  isWrongNetwork: boolean;
  expectedNetwork: string;
  expectedChainId: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchNetwork: () => void;
};

export const Header: React.FC<Props> = ({
  account,
  isConnected,
  chainId,
  loading,
  switchingNetwork,
  isWrongNetwork,
  expectedNetwork,
  expectedChainId,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
}) => {
  return (
    <header className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <NavLink to="/mining/pools" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              LiquidityMining
            </h1>
          </NavLink>

          <nav className="hidden md:flex gap-1">
            {TABS.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/mining/pools'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive ? 'text-white bg-slate-700' : 'text-gray-400 hover:text-white hover:bg-slate-800'
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
            expectedNetwork={expectedNetwork}
            expectedChainId={expectedChainId}
            switchingNetwork={switchingNetwork}
            loading={loading}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onSwitchNetwork={onSwitchNetwork}
            connectClassName="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium transition-colors disabled:opacity-50"
            disconnectClassName="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
            switchClassName="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium transition-colors text-xs"
          />
        </div>

        <div className="md:hidden flex gap-1 pb-4 overflow-x-auto">
          {TABS.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/mining/pools'}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  isActive ? 'text-white bg-slate-700' : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
};
