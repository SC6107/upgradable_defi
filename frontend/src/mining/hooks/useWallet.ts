import { useState, useCallback, useEffect } from 'react';
import Web3Service from '../services/web3';
import {
  TARGET_CHAIN_ID,
  TARGET_NETWORK_LABEL,
  isExpectedChainId,
  switchWalletToTargetNetwork,
} from '@/config/network';

interface WalletState {
  account: string | null;
  isConnected: boolean;
  chainId: number | null;
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    account: null,
    isConnected: false,
    chainId: null,
  });
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateChainId = useCallback(async (): Promise<number | null> => {
    if (!window.ethereum) return null;
    const chainIdValue = await window.ethereum.request({ method: 'eth_chainId' });
    const chainId =
      typeof chainIdValue === 'string'
        ? parseInt(chainIdValue, 16)
        : typeof chainIdValue === 'number'
          ? chainIdValue
          : Number.NaN;
    if (!Number.isFinite(chainId)) return null;
    setWallet((prev) => ({ ...prev, chainId }));
    return chainId;
  }, []);

  const switchNetwork = useCallback(async () => {
    setSwitchingNetwork(true);
    setError(null);
    try {
      const nextChainId = await switchWalletToTargetNetwork();
      setWallet((prev) => ({ ...prev, chainId: nextChainId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to switch to ${TARGET_NETWORK_LABEL}`);
      throw err;
    } finally {
      setSwitchingNetwork(false);
    }
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const account = await Web3Service.connect();
      const chainId = await updateChainId();
      if (chainId != null && !isExpectedChainId(chainId)) {
        await switchNetwork();
        await Web3Service.disconnect();
        const switchedAccount = await Web3Service.connect();
        const switchedChainId = await updateChainId();
        setWallet({
          account: switchedAccount,
          isConnected: true,
          chainId: switchedChainId,
        });
        return;
      }

      setWallet({
        account,
        isConnected: true,
        chainId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, [switchNetwork, updateChainId]);

  const disconnect = useCallback(async () => {
    await Web3Service.disconnect();
    setWallet({
      account: null,
      isConnected: false,
      chainId: null,
    });
  }, []);

  useEffect(() => {
    if (!window.ethereum) return undefined;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const raw = args[0];
      const accounts = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
      if (accounts.length === 0) {
        await disconnect();
        return;
      }
      setWallet((prev) => ({ ...prev, account: accounts[0], isConnected: true }));
    };

    const handleChainChanged = (...args: unknown[]) => {
      const chainIdValue = args[0];
      const nextChainId =
        typeof chainIdValue === 'string'
          ? parseInt(chainIdValue, 16)
          : typeof chainIdValue === 'number'
            ? chainIdValue
            : Number.NaN;
      if (!Number.isFinite(nextChainId)) return;
      setWallet((prev) => ({ ...prev, chainId: nextChainId }));
    };

    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum.on?.('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  return {
    wallet,
    connect,
    disconnect,
    switchNetwork,
    loading,
    switchingNetwork,
    error,
    expectedChainId: TARGET_CHAIN_ID,
    expectedNetwork: TARGET_NETWORK_LABEL,
    isWrongNetwork: wallet.isConnected && !isExpectedChainId(wallet.chainId),
  };
};
