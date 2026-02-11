/**
 * Shared wallet connection UI used by both lending and mining Headers.
 * Renders connect/disconnect buttons, address display, and network warning.
 */
import React from 'react';
import { formatAddress } from '@/shared/utils/format';

type Props = {
  account: string | null;
  isConnected: boolean;
  chainId: number | null;
  isWrongNetwork: boolean;
  expectedNetwork: string;
  expectedChainId: number;
  switchingNetwork: boolean;
  loading?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchNetwork: () => void;
  connectClassName?: string;
  disconnectClassName?: string;
  switchClassName?: string;
};

export const WalletStatus: React.FC<Props> = ({
  account,
  isConnected,
  chainId,
  isWrongNetwork,
  expectedNetwork,
  expectedChainId,
  switchingNetwork,
  loading,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
  connectClassName = 'rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500',
  disconnectClassName = 'rounded-lg bg-red-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500',
  switchClassName = 'rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50',
}) => {
  if (isConnected && account) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-right sm:block">
          <span className="block text-xs text-zinc-500">
            Connected {chainId != null ? `(Chain ${chainId})` : ''}
          </span>
          <span className="font-mono text-sm text-zinc-200">{formatAddress(account)}</span>
        </span>
        {isWrongNetwork && (
          <button
            type="button"
            onClick={onSwitchNetwork}
            disabled={switchingNetwork}
            className={switchClassName}
            title={`Switch to ${expectedNetwork} (${expectedChainId})`}
          >
            {switchingNetwork ? 'Switching...' : `Switch to ${expectedNetwork}`}
          </button>
        )}
        <button type="button" onClick={onDisconnect} className={disconnectClassName}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={loading}
      className={connectClassName}
    >
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
