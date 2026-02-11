/**
 * Shared wallet connection hook used by both lending and mining modules.
 * Accepts a web3Service instance so each module uses its own Web3 singleton.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  TARGET_CHAIN_ID,
  TARGET_NETWORK_LABEL,
  isExpectedChainId,
  switchWalletToTargetNetwork,
} from '@/config/network';

interface Web3ServiceLike {
  connect(): Promise<string>;
  disconnect(): Promise<void>;
}

export const useWallet = (web3Service: Web3ServiceLike) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateChainId = useCallback(async (): Promise<number | null> => {
    if (!window.ethereum) return null;
    const chainIdValue = await window.ethereum.request({ method: 'eth_chainId' });
    const parsed =
      typeof chainIdValue === 'string'
        ? parseInt(chainIdValue, 16)
        : typeof chainIdValue === 'number'
          ? chainIdValue
          : Number.NaN;
    if (!Number.isFinite(parsed)) return null;
    setChainId(parsed);
    return parsed;
  }, []);

  const switchNetwork = useCallback(async () => {
    setSwitchingNetwork(true);
    setError(null);
    try {
      const next = await switchWalletToTargetNetwork();
      setChainId(next);
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
      const address = await web3Service.connect();
      setAccount(address);
      setIsConnected(true);

      const connectedChain = await updateChainId();
      if (connectedChain != null && !isExpectedChainId(connectedChain)) {
        await switchNetwork();
        await web3Service.disconnect();
        const nextAddress = await web3Service.connect();
        setAccount(nextAddress);
        await updateChainId();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, [web3Service, switchNetwork, updateChainId]);

  const disconnect = useCallback(async () => {
    await web3Service.disconnect();
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
  }, [web3Service]);

  useEffect(() => {
    if (!window.ethereum) return undefined;

    const handleAccountsChanged = (...args: unknown[]) => {
      const raw = args[0];
      const accounts = Array.isArray(raw)
        ? raw.filter((item): item is string => typeof item === 'string')
        : [];
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
      }
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
      setChainId(nextChainId);
      window.location.reload();
    };

    window.ethereum?.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum?.on?.('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [account, disconnect]);

  return {
    account,
    isConnected,
    chainId,
    isWrongNetwork: isConnected && !isExpectedChainId(chainId),
    expectedChainId: TARGET_CHAIN_ID,
    expectedNetwork: TARGET_NETWORK_LABEL,
    switchingNetwork,
    loading,
    error,
    connect,
    disconnect,
    switchNetwork,
  };
};
