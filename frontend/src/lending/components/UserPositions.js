import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { formatPct, getPrice, formatUsdAuto, shortAddress, getPositionBalance, getSupplyApy, getBorrowApy } from '../utils';
import Web3Service from '../services/web3';
function buildSummary(positions, liquidityUsd) {
    const totalSupplied = positions.reduce((s, p) => s + getPositionBalance(p, 'supplyUnderlying') * getPrice(p), 0);
    const totalBorrowed = positions.reduce((s, p) => s + getPositionBalance(p, 'borrowBalance') * getPrice(p), 0);
    const borrowLimitFromCf = positions.reduce((s, p) => s + getPositionBalance(p, 'supplyUnderlying') * getPrice(p) * (p.collateralFactor ?? 0), 0);
    // When liquidity is 0 (not entered markets), show theoretical limit from collateral so user sees e.g. $500
    const borrowLimit = typeof liquidityUsd === 'number' && liquidityUsd > 0
        ? totalBorrowed + liquidityUsd
        : borrowLimitFromCf;
    return { totalSupplied, totalBorrowed, borrowLimit };
}
function PositionTable({ title, positions, markets, type, onAction, actionLabel, actionClass, valueKey, apyKey, }) {
    // Same APY source as Markets: position first, then market fallback (getSupplyApy/getBorrowApy)
    const getApy = (p) => {
        const m = markets?.find((x) => x.market?.toLowerCase() === p.market?.toLowerCase()) ?? null;
        return apyKey === 'supplyRatePerYear' ? getSupplyApy(p, m) : getBorrowApy(p, m);
    };
    return (_jsxs("section", { children: [_jsx("h3", { className: "text-lg font-semibold text-zinc-200 mb-3", children: title }), _jsx("div", { className: "rounded-xl border border-zinc-700/80 overflow-hidden bg-zinc-900/60", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-zinc-700/80 bg-zinc-800/80 text-zinc-400 text-left", children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Asset" }), _jsx("th", { className: "px-4 py-3 text-right font-medium", children: "Balance (underlying)" }), _jsx("th", { className: "px-4 py-3 text-right font-medium", children: "Value (USD)" }), _jsx("th", { className: "px-4 py-3 text-right font-medium", children: "APY" }), type === 'supply' && (_jsx("th", { className: "px-4 py-3 text-right font-medium", children: "Collateral" })), _jsx("th", { className: "px-4 py-3 text-right font-medium w-24", children: "Action" })] }) }), _jsx("tbody", { className: "divide-y divide-zinc-700/60", children: positions.map((p) => {
                                const balance = getPositionBalance(p, valueKey);
                                const price = getPrice(p);
                                // Value USD = balance (human token) × price (USD per token); API uses human units
                                const valueUsd = Number.isFinite(balance) && Number.isFinite(price) ? balance * price : 0;
                                const apyRaw = getApy(p);
                                const apy = apyRaw != null && Number.isFinite(Number(apyRaw)) ? Number(apyRaw) : undefined;
                                const decimals = typeof p.decimals === 'number' ? p.decimals : 4;
                                return (_jsxs("tr", { className: "hover:bg-zinc-800/50", children: [_jsx("td", { className: "px-4 py-3 font-medium text-white", children: p.symbol }), _jsxs("td", { className: "px-4 py-3 text-right text-zinc-200", children: [Number.isFinite(balance) ? balance.toFixed(Math.min(decimals, 8)) : '0.0000', ' ', _jsx("span", { className: "text-zinc-500", children: p.symbol })] }), _jsx("td", { className: "px-4 py-3 text-right text-zinc-200", children: formatUsdAuto(valueUsd) }), _jsxs("td", { className: `px-4 py-3 text-right ${type === 'supply' ? 'text-emerald-400' : 'text-amber-400'}`, children: [formatPct(apy), "%"] }), type === 'supply' && (_jsxs("td", { className: "px-4 py-3 text-right text-zinc-400", children: [((p.collateralFactor ?? 0) * 100).toFixed(0), "%"] })), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx("button", { type: "button", onClick: () => onAction(p), className: `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${actionClass}`, children: actionLabel }) })] }, p.market));
                            }) })] }) })] }));
}
export function UserPositions({ account, loading, connected, markets = [], onWithdraw, onRepay, comptrollerAddress, onRefetch, }) {
    const [entering, setEntering] = useState(false);
    const pollRef = useRef(null);
    // Refetch when user lands on positions tab, and poll once more after delay so balance/value/APY are fresh
    useEffect(() => {
        if (!connected || !onRefetch)
            return;
        onRefetch();
        pollRef.current = setTimeout(() => {
            onRefetch();
            pollRef.current = null;
        }, 2500);
        return () => {
            if (pollRef.current)
                clearTimeout(pollRef.current);
        };
    }, [connected, onRefetch]);
    const handleEnterMarkets = async () => {
        if (!comptrollerAddress || !account || !onRefetch)
            return;
        const markets = account.positions.filter((p) => getPositionBalance(p, 'supplyUnderlying') > 0).map((p) => p.market);
        if (markets.length === 0)
            return;
        setEntering(true);
        try {
            await Web3Service.enterMarkets(comptrollerAddress, markets);
            await onRefetch();
        }
        finally {
            setEntering(false);
        }
    };
    if (!connected) {
        return (_jsx("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-12 text-center", children: _jsx("p", { className: "text-zinc-400", children: "Please connect your wallet first" }) }));
    }
    if (loading) {
        return (_jsxs("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-12 text-center", children: [_jsx("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" }), _jsx("p", { className: "mt-3 text-zinc-400", children: "Loading positions..." })] }));
    }
    if (!account || !account.positions?.length) {
        return (_jsx("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-12 text-center", children: _jsx("p", { className: "text-zinc-400", children: "No positions yet" }) }));
    }
    const supplyPositions = account.positions.filter((p) => getPositionBalance(p, 'supplyUnderlying') > 0);
    const borrowPositions = account.positions.filter((p) => getPositionBalance(p, 'borrowBalance') > 0);
    const liquidityUsd = account.liquidityUsd ?? account.liquidity;
    const summary = buildSummary(account.positions, liquidityUsd);
    // Always show when user has supply; enterMarkets is idempotent (no-op if already entered)
    const showEnterMarkets = supplyPositions.length > 0 && Boolean(comptrollerAddress) && Boolean(onRefetch);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("p", { className: "text-zinc-500 text-sm", children: ["Address: ", _jsx("span", { className: "font-mono text-zinc-300", children: shortAddress(account.account) })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsxs("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4", children: [_jsx("div", { className: "text-zinc-500 text-xs mb-0.5", children: "Total Supplied (USD)" }), _jsx("div", { className: "text-xl font-semibold text-white", children: formatUsdAuto(summary.totalSupplied) })] }), _jsxs("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4", children: [_jsx("div", { className: "text-zinc-500 text-xs mb-0.5", children: "Total Borrowed (USD)" }), _jsx("div", { className: "text-xl font-semibold text-white", children: formatUsdAuto(summary.totalBorrowed) })] }), _jsxs("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4", children: [_jsx("div", { className: "text-zinc-500 text-xs mb-0.5", children: "Borrow Limit" }), _jsx("div", { className: "text-xl font-semibold text-white", children: formatUsdAuto(summary.borrowLimit) })] }), _jsxs("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4", children: [_jsx("div", { className: "text-zinc-500 text-xs mb-0.5", children: "Health" }), _jsx("div", { className: `text-xl font-semibold ${account.isHealthy ? 'text-emerald-400' : 'text-red-400'}`, children: account.isHealthy ? 'Healthy' : 'At Risk' })] })] }), showEnterMarkets && (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-amber-200 text-sm", children: [_jsx("span", { children: "Supply is not used as collateral yet. Enable it to borrow and show your limit." }), _jsx("button", { type: "button", onClick: handleEnterMarkets, disabled: entering, className: "shrink-0 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-50", children: entering ? 'Processing...' : 'Enable as Collateral' })] })), supplyPositions.length > 0 && (_jsx(PositionTable, { title: "Supply Positions", positions: supplyPositions, markets: markets, type: "supply", valueKey: "supplyUnderlying", apyKey: "supplyRatePerYear", onAction: onWithdraw, actionLabel: "Withdraw", actionClass: "bg-red-600/90 hover:bg-red-500 text-white" })), borrowPositions.length > 0 && (_jsx(PositionTable, { title: "Borrow Positions", positions: borrowPositions, markets: markets, type: "borrow", valueKey: "borrowBalance", apyKey: "borrowRatePerYear", onAction: onRepay, actionLabel: "Repay", actionClass: "bg-teal-600/90 hover:bg-teal-500 text-white" })), supplyPositions.length === 0 && borrowPositions.length === 0 && (_jsx("p", { className: "text-zinc-500 text-sm text-center py-6", children: "No supply or borrow positions yet" }))] }));
}
