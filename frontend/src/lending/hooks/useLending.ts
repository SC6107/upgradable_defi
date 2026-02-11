/**
 * Lending Hooks
 * Module-specific hooks (useAccount, useTransactions) and re-exports of shared hooks.
 */
import { useState, useCallback, useEffect } from 'react';
import API from '../services/api';
import Web3Service from '../services/web3';
import type { AccountData, TransactionEvent } from '../types';
import { useWallet as useSharedWallet } from '@/shared/hooks/useWallet';

// Re-export shared hooks so lending/App.tsx imports stay unchanged
export { useMarkets, useHealth } from '@/shared/hooks/useAPI';

/**
 * Lending-specific wallet hook (delegates to the shared hook with the lending Web3Service).
 */
export const useWallet = () => useSharedWallet(Web3Service);

/**
 * Hook for fetching lending account data (module-specific: computes borrowLimit/totals).
 */
export const useAccount = (address: string | null) => {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!address) {
      setAccount(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await API.getAccount(address);
      setAccount(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch account';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchAccount();
      const interval = setInterval(fetchAccount, 15000);
      return () => clearInterval(interval);
    }
    setAccount(null);
    setLoading(false);
    setError(null);
    return undefined;
  }, [address, fetchAccount]);

  return { account, loading, error, refetch: fetchAccount };
};

/**
 * Hook for transaction events (lending-specific).
 */
export const useTransactions = (account: string | null, limit: number = 50) => {
  const [transactions, setTransactions] = useState<TransactionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!account) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const events = await API.getEvents(undefined, undefined, account, undefined, undefined, limit);
      setTransactions(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [account, limit]);

  useEffect(() => {
    if (account) {
      fetchTransactions();
      const interval = setInterval(fetchTransactions, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [account, fetchTransactions]);

  return { transactions, loading, error, refetch: fetchTransactions };
};
