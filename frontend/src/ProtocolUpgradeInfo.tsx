/**
 * Protocol Upgrade Info
 * Shows that the protocol is upgradeable (UUPS), timelock, and on-chain contract versions.
 */
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface UpgradeInfo {
  upgradeable: boolean;
  pattern: string;
  description?: string;
  timelockDelayHours: number;
  contractVersions: {
    comptroller?: number;
    priceOracle?: number;
    markets?: { index: number; version: number | null }[];
    liquidityMining?: { index: number; version: number | null }[];
  };
}

export const ProtocolUpgradeInfo: React.FC = () => {
  const [info, setInfo] = useState<UpgradeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/protocol/upgrade-info`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="text-xs text-gray-500 mt-2">Loading protocol info...</div>
    );
  }
  if (error || !info) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-slate-700">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-600 text-slate-300">
          <span className="text-emerald-400 font-medium">↑ Upgradeable</span>
        </span>
        <span className="text-gray-500">{info.pattern} proxy</span>
        <span className="text-gray-500">•</span>
        <span className="text-gray-500">Timelock: {info.timelockDelayHours}h</span>
        {info.contractVersions?.comptroller != null && (
          <>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">Comptroller v{info.contractVersions.comptroller}</span>
          </>
        )}
        {info.contractVersions?.priceOracle != null && (
          <span className="text-gray-400">Oracle v{info.contractVersions.priceOracle}</span>
        )}
        {info.contractVersions?.markets?.length ? (
          <span className="text-gray-400">
            Markets: {info.contractVersions.markets.map((m) => `v${m.version ?? '?'}`).join(', ')}
          </span>
        ) : null}
        {info.contractVersions?.liquidityMining?.length ? (
          <span className="text-gray-400">
            Mining: {info.contractVersions.liquidityMining.map((m) => `v${m.version ?? '?'}`).join(', ')}
          </span>
        ) : null}
      </div>
      {info.description && (
        <p className="mt-2 text-xs text-gray-500 max-w-2xl">{info.description}</p>
      )}
    </div>
  );
};
