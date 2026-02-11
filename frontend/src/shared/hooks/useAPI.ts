/**
 * Shared API hooks used by both lending and mining modules.
 * useMarkets and useHealth are identical across modules and share the same backend endpoint.
 */
import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/shared/services/apiClient';
import type { HealthStatus } from '@/shared/types/common';

interface MarketData {
  market: string;
  underlying: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  totalBorrows: number;
  totalReserves: number;
  cash: number;
  exchangeRate: number;
  utilization: number;
  borrowRatePerYear: number;
  supplyRatePerYear: number;
  price: number;
  collateralFactor: number;
  isListed: boolean;
  [key: string]: unknown;
}

export const useMarkets = <T extends MarketData = MarketData>() => {
  const [markets, setMarkets] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/markets');
      setMarkets((response.data?.items ?? []) as T[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch markets';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
    return undefined;
  }, [fetchMarkets]);

  return { markets, loading, error, refetch: fetchMarkets };
};

export const useHealth = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/health');
      setHealth(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { health, loading, error, refetch: fetchHealth };
};
