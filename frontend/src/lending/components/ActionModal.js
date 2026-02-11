import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import Web3Service from '../services/web3';
import API from '../services/api';
import { formatPct } from '../utils';
const LABELS = {
    supply: 'Supply',
    withdraw: 'Withdraw',
    borrow: 'Borrow',
    repay: 'Repay',
};
export function ActionModal({ isOpen, onClose, action, market, onSuccess, maxAmount = '0', comptrollerAddress, }) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [txHash, setTxHash] = useState(null);
    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setError(null);
            setTxHash(null);
        }
    }, [isOpen]);
    if (!isOpen || !market)
        return null;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setTxHash(null);
        const num = parseFloat(amount);
        if (!amount || num <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        setLoading(true);
        try {
            // Ensure we have comptroller for supply so enterMarkets runs (supply then counts as collateral for borrow)
            let compAddress = comptrollerAddress;
            if (action === 'supply' && !compAddress) {
                const addrs = await API.getContractAddresses().catch(() => ({}));
                compAddress = addrs.comptroller ?? null;
            }
            let hash;
            switch (action) {
                case 'supply':
                    hash = await Web3Service.supply(market.market, amount, market.underlying ?? '', compAddress);
                    break;
                case 'withdraw':
                    hash = await Web3Service.withdraw(market.market, amount, true);
                    break;
                case 'borrow':
                    hash = await Web3Service.borrow(market.market, amount);
                    break;
                case 'repay':
                    hash = await Web3Service.repay(market.market, amount, market.underlying);
                    break;
                default:
                    throw new Error('Unknown action');
            }
            setTxHash(hash);
            await Promise.resolve(onSuccess());
            await new Promise((r) => setTimeout(r, 500));
            onClose();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Transaction failed');
        }
        finally {
            setLoading(false);
        }
    };
    const isSupplyOrWithdraw = action === 'supply' || action === 'withdraw';
    const rate = isSupplyOrWithdraw ? market.supplyRatePerYear : market.borrowRatePerYear;
    const ratePct = rate != null ? formatPct(rate) : '0.00';
    const cfPct = (market.collateralFactor ?? 0) * 100;
    const utilPct = ((market.utilization ?? 0) * 100).toFixed(2);
    const canBorrow = action !== 'borrow' || parseFloat(maxAmount) > 0;
    const submitBtnClass = {
        supply: 'bg-teal-600 hover:bg-teal-500',
        withdraw: 'bg-red-600 hover:bg-red-500',
        borrow: 'bg-amber-600 hover:bg-amber-500',
        repay: 'bg-teal-600 hover:bg-teal-500',
    }[action];
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-xl border border-zinc-700/80 bg-zinc-900 p-6 shadow-xl", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("h2", { className: "text-xl font-semibold text-white", children: [LABELS[action], " ", market.symbol] }), _jsx("button", { type: "button", onClick: onClose, className: "rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white", "aria-label": "Close", children: _jsx("svg", { className: "h-5 w-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), txHash ? (_jsxs("div", { className: "py-6 text-center", children: [_jsx("div", { className: "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400", children: _jsx("svg", { className: "h-6 w-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("p", { className: "font-medium text-white", children: "Transaction successful" }), _jsxs("p", { className: "mt-1 text-xs text-zinc-500 font-mono", children: [txHash.slice(0, 10), "...", txHash.slice(-8)] })] })) : (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "mb-1.5 block text-sm font-medium text-zinc-400", children: "Amount" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "number", step: "any", min: "0", value: amount, onChange: (e) => setAmount(e.target.value), className: "w-full rounded-lg border border-zinc-600 bg-zinc-800 py-3 pl-4 pr-24 text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500", placeholder: "0", disabled: loading }), _jsxs("div", { className: "absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setAmount(maxAmount), className: "rounded bg-zinc-600 px-2 py-1 text-xs text-white hover:bg-zinc-500 disabled:opacity-50", disabled: loading, children: "MAX" }), _jsx("span", { className: "text-sm text-zinc-500", children: market.symbol })] })] }), maxAmount && parseFloat(maxAmount) > 0 && (_jsxs("p", { className: "mt-1 text-xs text-zinc-500", children: ["Available: ", parseFloat(maxAmount).toFixed(4), " ", market.symbol] })), action === 'borrow' && parseFloat(maxAmount) <= 0 && (_jsx("p", { className: "mt-1 text-xs text-amber-400", children: "No borrow limit. Supply assets first, then enable them as collateral on the Positions page." }))] }), _jsxs("div", { className: "mb-4 rounded-lg border border-zinc-700/80 bg-zinc-800/60 p-3 space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-zinc-500", children: isSupplyOrWithdraw ? 'Supply APY' : 'Borrow APY' }), _jsxs("span", { className: isSupplyOrWithdraw ? 'text-emerald-400' : 'text-amber-400', children: [ratePct, "%"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-zinc-500", children: "Collateral Factor" }), _jsxs("span", { className: "text-zinc-300", children: [cfPct.toFixed(0), "%"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-zinc-500", children: "Utilization" }), _jsxs("span", { className: "text-zinc-300", children: [utilPct, "%"] })] })] }), error && (_jsx("div", { className: "mb-4 max-w-full overflow-hidden rounded-lg border border-red-500/50 bg-red-950/30 px-3 py-2 text-sm text-red-300 break-words break-all whitespace-pre-wrap", children: error })), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: onClose, className: "flex-1 rounded-lg border border-zinc-600 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50", disabled: loading, children: "Cancel" }), _jsx("button", { type: "submit", className: `flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${submitBtnClass}`, disabled: loading || !canBorrow, children: loading ? (_jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx("span", { className: "h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" }), "Processing"] })) : (LABELS[action]) })] })] }))] }) }));
}
