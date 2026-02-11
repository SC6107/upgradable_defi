/**
 * Mining-specific API hooks.
 * useMarkets and useHealth are now shared — import from @/shared/hooks/useAPI.
 * Only useAccount remains here (mining-specific: simple passthrough).
 */
import { useState, useCallback, useEffect } from 'react';
import API from '@/mining/services/api';
import type { Account } from '@/mining/services/api';

export const useAccount = (address: string | null) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const data = await API.getAccount(address);
      setAccount(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchAccount();
    }
  }, [address, fetchAccount]);

  return { account, loading, error, refetch: fetchAccount };
};
