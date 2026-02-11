import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { formatPct, getPrice, getMarketSupplyUsd, getSupplyApy, getBorrowApy } from '../utils';
export function MarketsTable({ markets, loading, error, onRetry, onSupply, onBorrow }) {
    const [sortBy, setSortBy] = useState('symbol');
    const [desc, setDesc] = useState(true);
    const [copiedAddress, setCopiedAddress] = useState(null);
    const toggleSort = (key) => {
        if (sortBy === key)
            setDesc((d) => !d);
        else {
            setSortBy(key);
            setDesc(true);
        }
    };
    const handleCopyAddress = async (address) => {
        if (!address)
            return;
        try {
            await navigator.clipboard.writeText(address);
            setCopiedAddress(address);
            setTimeout(() => {
                setCopiedAddress((prev) => (prev === address ? null : prev));
            }, 1200);
        }
        catch {
            // Ignore clipboard failures (browser permissions/unsupported context).
        }
    };
    const sorted = useMemo(() => {
        return [...markets].sort((a, b) => {
            const supplyA = getMarketSupplyUsd(a);
            const supplyB = getMarketSupplyUsd(b);
            const supplyAprA = getSupplyApy(a) ?? 0;
            const supplyAprB = getSupplyApy(b) ?? 0;
            const borrowAprA = getBorrowApy(a) ?? 0;
            const borrowAprB = getBorrowApy(b) ?? 0;
            let cmp = 0;
            switch (sortBy) {
                case 'symbol':
                    cmp = (a.symbol ?? '').localeCompare(b.symbol ?? '');
                    break;
                case 'totalSupplyUsd':
                    cmp = supplyA - supplyB;
                    break;
                case 'supplyAPY':
                    cmp = supplyAprA - supplyAprB;
                    break;
                case 'borrowAPY':
                    cmp = borrowAprA - borrowAprB;
                    break;
            }
            return desc ? -cmp : cmp;
        });
    }, [markets, sortBy, desc]);
    if (markets.length === 0) {
        return (_jsxs("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-12 text-center text-zinc-400 space-y-3", children: [loading ? (_jsxs("div", { className: "inline-flex items-center gap-2 text-zinc-300", children: [_jsx("span", { className: "h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" }), "Fetching markets..."] })) : null, !loading && error ? _jsx("div", { className: "text-red-300", children: error }) : null, !loading && !error ? _jsx("div", { children: "No markets available" }) : null, onRetry ? (_jsx("button", { type: "button", onClick: onRetry, className: "rounded-lg bg-zinc-700 px-3 py-1.5 text-sm text-white hover:bg-zinc-600", children: "Retry" })) : null] }));
    }
    const hasData = markets.some((m) => m.symbol != null || m.totalSupply != null || getPrice(m) > 0);
    const Th = ({ label, keyName, align = 'left', }) => (_jsx("th", { className: `px-4 py-3 font-medium text-zinc-400 cursor-pointer hover:text-zinc-200 ${align === 'right' ? 'text-right' : 'text-left'}`, onClick: () => toggleSort(keyName), children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [label, sortBy === keyName && _jsx("span", { className: "text-teal-400", children: desc ? '↓' : '↑' })] }) }));
    return (_jsxs("div", { className: "space-y-3", children: [loading && (_jsxs("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-400 inline-flex items-center gap-2", children: [_jsx("span", { className: "h-3 w-3 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" }), "Refreshing markets..."] })), !loading && error && (_jsxs("div", { className: "rounded-xl border border-red-700/50 bg-red-950/30 px-4 py-3 text-red-300 text-sm flex items-center justify-between gap-4", children: [_jsx("span", { children: error }), onRetry ? (_jsx("button", { type: "button", onClick: onRetry, className: "shrink-0 rounded-lg bg-red-700 px-3 py-1.5 text-white hover:bg-red-600", children: "Retry" })) : null] })), !hasData && (_jsx("div", { className: "rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-amber-200 text-sm", children: "Chain data missing. Please ensure Anvil is running and contracts are deployed, then restart the backend." })), _jsx("div", { className: "rounded-xl border border-zinc-700/80 overflow-hidden bg-zinc-900/60", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-zinc-700/80 bg-zinc-800/80", children: [_jsx(Th, { label: "Asset", keyName: "symbol" }), _jsx(Th, { label: "Total Supply (USD)", keyName: "totalSupplyUsd", align: "right" }), _jsx("th", { className: "px-4 py-3 text-right font-medium text-zinc-400", children: "Total Borrows" }), _jsx(Th, { label: "Supply APY", keyName: "supplyAPY", align: "right" }), _jsx(Th, { label: "Borrow APY", keyName: "borrowAPY", align: "right" }), _jsx("th", { className: "px-4 py-3 text-right font-medium text-zinc-400", children: "Utilization" }), _jsx("th", { className: "px-4 py-3 text-center font-medium text-zinc-400 w-40", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-zinc-700/60", children: sorted.map((m) => {
                                const price = getPrice(m);
                                const totalBorrows = m.totalBorrows ?? m.totalBorrowsUnderlying ?? 0;
                                const supplyUsd = getMarketSupplyUsd(m);
                                const borrowsUsd = m.totalBorrowsUsd ?? totalBorrows * price;
                                const supplyApr = getSupplyApy(m);
                                const borrowApr = getBorrowApy(m);
                                const util = (m.utilization ?? 0) * 100;
                                const symbol = m.symbol ?? '—';
                                const abbr = symbol.length >= 2 ? symbol.slice(0, 2) : (m.market?.slice(2, 4) ?? '—');
                                const tokenAddress = m.underlying || m.market;
                                return (_jsxs("tr", { className: "hover:bg-zinc-800/50", children: [_jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-9 w-9 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-semibold text-sm", children: abbr }), _jsxs("div", { children: [_jsx("div", { className: "font-medium text-white", children: symbol }), _jsxs("div", { className: "inline-flex items-center gap-2 text-xs text-zinc-500", children: [_jsxs("span", { children: [tokenAddress?.slice(0, 10), "..."] }), tokenAddress ? (_jsx("button", { type: "button", onClick: () => handleCopyAddress(tokenAddress), className: "rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-600", title: tokenAddress, children: copiedAddress === tokenAddress ? 'Copied' : 'Copy' })) : null] })] })] }) }), _jsxs("td", { className: "px-4 py-3 text-right text-zinc-200", children: ["$", supplyUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })] }), _jsxs("td", { className: "px-4 py-3 text-right text-zinc-200", children: ["$", borrowsUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })] }), _jsxs("td", { className: "px-4 py-3 text-right text-emerald-400", children: [formatPct(supplyApr ?? undefined), "%"] }), _jsxs("td", { className: "px-4 py-3 text-right text-amber-400", children: [formatPct(borrowApr ?? undefined), "%"] }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx("div", { className: "w-14 h-1.5 rounded-full bg-zinc-700 overflow-hidden", children: _jsx("div", { className: "h-full rounded-full bg-teal-500/80", style: { width: `${Math.min(100, util)}%` } }) }), _jsxs("span", { className: "text-zinc-400 w-10", children: [util.toFixed(1), "%"] })] }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex gap-2 justify-center", children: [_jsx("button", { type: "button", onClick: () => onSupply(m), className: "px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600/90 hover:bg-teal-500 text-white transition-colors", children: "Supply" }), _jsx("button", { type: "button", onClick: () => onBorrow(m), className: "px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-600 hover:bg-zinc-500 text-white transition-colors", children: "Borrow" })] }) })] }, m.market ?? symbol));
                            }) })] }) })] }));
}
