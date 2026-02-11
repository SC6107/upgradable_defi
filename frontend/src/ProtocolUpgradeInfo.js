import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Protocol Upgrade Info
 * Shows that the protocol is upgradeable (UUPS), timelock, and on-chain contract versions.
 */
import { useEffect, useState } from 'react';
const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const ProtocolUpgradeInfo = () => {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(`${API_BASE}/protocol/upgrade-info`)
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
            .then((data) => {
            if (!cancelled)
                setInfo(data);
        })
            .catch((e) => {
            if (!cancelled)
                setError(e instanceof Error ? e.message : 'Failed to load');
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);
    if (loading) {
        return (_jsx("div", { className: "text-xs text-gray-500 mt-2", children: "Loading protocol info..." }));
    }
    if (error || !info) {
        return null;
    }
    return (_jsxs("div", { className: "mt-6 pt-6 border-t border-slate-700", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 text-sm", children: [_jsx("span", { className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-600 text-slate-300", children: _jsx("span", { className: "text-emerald-400 font-medium", children: "\u2191 Upgradeable" }) }), _jsxs("span", { className: "text-gray-500", children: [info.pattern, " proxy"] }), _jsx("span", { className: "text-gray-500", children: "\u2022" }), _jsxs("span", { className: "text-gray-500", children: ["Timelock: ", info.timelockDelayHours, "h"] }), info.contractVersions?.comptroller != null && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-gray-500", children: "\u2022" }), _jsxs("span", { className: "text-gray-400", children: ["Comptroller v", info.contractVersions.comptroller] })] })), info.contractVersions?.priceOracle != null && (_jsxs("span", { className: "text-gray-400", children: ["Oracle v", info.contractVersions.priceOracle] })), info.contractVersions?.markets?.length ? (_jsxs("span", { className: "text-gray-400", children: ["Markets: ", info.contractVersions.markets.map((m) => `v${m.version ?? '?'}`).join(', ')] })) : null, info.contractVersions?.liquidityMining?.length ? (_jsxs("span", { className: "text-gray-400", children: ["Mining: ", info.contractVersions.liquidityMining.map((m) => `v${m.version ?? '?'}`).join(', ')] })) : null] }), info.description && (_jsx("p", { className: "mt-2 text-xs text-gray-500 max-w-2xl", children: info.description }))] }));
};
