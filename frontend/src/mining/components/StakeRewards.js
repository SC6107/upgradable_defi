import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Stake & Rewards
 * Stake dTokens in LiquidityMining to earn GOV; withdraw and claim rewards.
 */
import { useCallback, useEffect, useState } from 'react';
import API from '../services/api';
import Web3Service from '../services/web3';
export function StakeRewards({ account, isConnected, onSuccess, }) {
    const [pools, setPools] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stakeAmounts, setStakeAmounts] = useState({});
    const [withdrawAmounts, setWithdrawAmounts] = useState({});
    const [loadingTx, setLoadingTx] = useState(null);
    const [txHash, setTxHash] = useState(null);
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [poolsRes, positionsRes] = await Promise.all([
                API.getLiquidityMining(),
                account ? API.getLiquidityMiningAccount(account) : Promise.resolve([]),
            ]);
            setPools(poolsRes);
            setPositions(positionsRes);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        }
        finally {
            setLoading(false);
        }
    }, [account]);
    useEffect(() => {
        void fetchData();
    }, [fetchData]);
    const getPosition = (miningAddress) => positions.find((p) => p.mining?.toLowerCase() === miningAddress?.toLowerCase());
    const handleStake = async (miningAddress) => {
        const amount = stakeAmounts[miningAddress];
        if (!amount || parseFloat(amount) <= 0)
            return;
        setLoadingTx(miningAddress);
        setTxHash(null);
        try {
            const hash = await Web3Service.stake(miningAddress, amount);
            setTxHash(hash);
            setStakeAmounts((s) => ({ ...s, [miningAddress]: '' }));
            await fetchData();
            onSuccess?.();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Stake failed');
        }
        finally {
            setLoadingTx(null);
        }
    };
    const handleWithdraw = async (miningAddress) => {
        const amount = withdrawAmounts[miningAddress];
        if (!amount || parseFloat(amount) <= 0)
            return;
        setLoadingTx(miningAddress);
        setTxHash(null);
        try {
            const hash = await Web3Service.withdraw(miningAddress, amount);
            setTxHash(hash);
            setWithdrawAmounts((w) => ({ ...w, [miningAddress]: '' }));
            await fetchData();
            onSuccess?.();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Withdraw failed');
        }
        finally {
            setLoadingTx(null);
        }
    };
    const handleClaim = async (miningAddress) => {
        setLoadingTx(miningAddress);
        setTxHash(null);
        try {
            const hash = await Web3Service.getReward(miningAddress);
            setTxHash(hash);
            await fetchData();
            onSuccess?.();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Claim failed');
        }
        finally {
            setLoadingTx(null);
        }
    };
    if (!isConnected) {
        return (_jsx("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-8 text-center", children: _jsx("p", { className: "text-gray-400", children: "Please connect your wallet first to stake dToken or claim GOV." }) }));
    }
    if (loading) {
        return (_jsx("div", { className: "flex justify-center py-12", children: _jsx("div", { className: "animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" }) }));
    }
    if (error) {
        return (_jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-6", children: [_jsx("p", { className: "text-red-400", children: error }), _jsx("button", { onClick: () => void fetchData(), className: "mt-2 px-4 py-2 rounded-lg bg-slate-600 text-white text-sm", children: "Retry" })] }));
    }
    if (pools.length === 0) {
        return (_jsx("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-8 text-center", children: _jsx("p", { className: "text-gray-400", children: "No liquidity mining pools available." }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-white mb-2", children: "Stake dToken to Earn GOV" }), _jsx("p", { className: "text-gray-400 text-sm", children: "Stake dTokens from lending markets (e.g. dUSDC, dWETH) in the mining contract to earn governance tokens (GOV) on a time-weighted basis." })] }), txHash && (_jsxs("p", { className: "text-green-400 text-sm", children: ["Recent tx: ", txHash.slice(0, 16), "..."] })), _jsx("div", { className: "space-y-4", children: pools.map((pool) => {
                    const pos = getPosition(pool.mining);
                    const staked = pos?.stakedBalance ?? 0;
                    const earned = pos?.earned ?? 0;
                    const stakeAmt = stakeAmounts[pool.mining] ?? '';
                    const withdrawAmt = withdrawAmounts[pool.mining] ?? '';
                    const busy = loadingTx === pool.mining;
                    return (_jsxs("div", { className: "bg-slate-800 rounded-lg border border-slate-700 p-6", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-semibold text-white", children: [pool.stakingSymbol ?? 'dToken', " \u2192 ", pool.rewardsSymbol ?? 'GOV'] }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: [pool.mining?.slice(0, 10), "..."] })] }), _jsxs("div", { className: "flex gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-400", children: "Staked: " }), _jsx("span", { className: "text-white font-medium", children: staked.toFixed(4) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-400", children: "Earned: " }), _jsxs("span", { className: "text-green-400 font-medium", children: [earned.toFixed(4), " GOV"] })] })] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-end gap-3", children: [_jsxs("div", { className: "flex-1 min-w-[120px]", children: [_jsx("label", { className: "block text-xs text-gray-400 mb-1", children: "Stake Amount" }), _jsx("input", { type: "text", value: stakeAmt, onChange: (e) => setStakeAmounts((s) => ({ ...s, [pool.mining]: e.target.value })), placeholder: "0", className: "w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm" })] }), _jsx("button", { type: "button", disabled: busy || !stakeAmt || parseFloat(stakeAmt) <= 0, onClick: () => handleStake(pool.mining), className: "px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-sm font-medium", children: busy ? '...' : 'Stake' }), _jsxs("div", { className: "flex-1 min-w-[120px]", children: [_jsx("label", { className: "block text-xs text-gray-400 mb-1", children: "Withdraw Amount" }), _jsx("input", { type: "text", value: withdrawAmt, onChange: (e) => setWithdrawAmounts((w) => ({ ...w, [pool.mining]: e.target.value })), placeholder: "0", className: "w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm" })] }), _jsx("button", { type: "button", disabled: busy || !withdrawAmt || parseFloat(withdrawAmt) <= 0, onClick: () => handleWithdraw(pool.mining), className: "px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-sm font-medium", children: busy ? '...' : 'Withdraw' }), _jsx("button", { type: "button", disabled: busy || earned <= 0, onClick: () => handleClaim(pool.mining), className: "px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium", children: busy ? '...' : 'Claim GOV' })] })] }, pool.mining));
                }) })] }));
}
