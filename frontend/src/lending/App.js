import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { MarketsTable } from './components/MarketsTable';
import { UserPositions } from './components/UserPositions';
import { ActionModal } from './components/ActionModal';
import { useMarkets, useAccount, useWallet } from './hooks/useLending';
import API from './services/api';
import { getMarketSupplyUsd, formatTvl, getPrice, getPositionBalance } from './utils';
const LENDING_TABS = ['markets', 'positions'];
function useLendingTab() {
    const { pathname } = useLocation();
    const segment = pathname.replace(/^\/lending\/?/, '').split('/')[0] || 'markets';
    return LENDING_TABS.includes(segment) ? segment : 'markets';
}
function LendingApp() {
    const activeTab = useLendingTab();
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [action, setAction] = useState('supply');
    const [selectedMarket, setSelectedMarket] = useState(null);
    const [maxAmount, setMaxAmount] = useState('0');
    const [comptroller, setComptroller] = useState(null);
    const [refetchError, setRefetchError] = useState(null);
    const { markets, loading: marketsLoading, error: marketsError, refetch: refetchMarkets, } = useMarkets();
    const { account, isConnected, chainId, isWrongNetwork, expectedChainId, expectedNetwork, switchingNetwork, connect, disconnect, switchNetwork, } = useWallet();
    const { account: accountData, loading: accountLoading, refetch: refetchAccount } = useAccount(account);
    useEffect(() => {
        API.getContractAddresses().then((r) => setComptroller(r.comptroller ?? null)).catch(() => { });
    }, []);
    // Refetch account when user switches to Positions tab so list is in sync with markets
    useEffect(() => {
        if (activeTab === 'positions' && account)
            refetchAccount();
    }, [activeTab, account, refetchAccount]);
    const openModal = (market, a, max) => {
        setSelectedMarket(market);
        setAction(a);
        setMaxAmount(max);
        setModalOpen(true);
        // Ensure we have comptroller for supply so enterMarkets can run (enables borrow limit)
        if (a === 'supply' && !comptroller) {
            API.getContractAddresses().then((r) => setComptroller(r.comptroller ?? null)).catch(() => { });
        }
    };
    const handleSupply = (market) => openModal(market, 'supply', '1000000');
    const handleBorrow = (market) => {
        const availableUsd = accountData?.availableToBorrow ?? 0;
        const price = getPrice(market);
        const maxToken = price > 0 ? availableUsd / price : 0;
        openModal(market, 'borrow', String(maxToken));
    };
    const handleWithdraw = (position) => {
        const market = markets.find((m) => m.market?.toLowerCase() === position.market?.toLowerCase());
        if (market)
            openModal(market, 'withdraw', String(getPositionBalance(position, 'supplyUnderlying')));
    };
    const handleRepay = (position) => {
        const market = markets.find((m) => m.market?.toLowerCase() === position.market?.toLowerCase());
        if (market)
            openModal(market, 'repay', String(getPositionBalance(position, 'borrowBalance')));
    };
    const refetch = async () => {
        setRefetchError(null);
        try {
            await refetchMarkets();
            if (account)
                await refetchAccount();
        }
        catch (e) {
            setRefetchError(e instanceof Error ? e.message : 'Failed to refresh data');
        }
    };
    const handleModalSuccess = async () => {
        setRefetchError(null);
        try {
            // Wait for chain/RPC to reflect the new state
            await new Promise((r) => setTimeout(r, 1500));
            await refetchMarkets();
            if (account)
                await refetchAccount();
            // After supply: if borrow limit is still 0, user hasn't entered markets — call enterMarkets so they can borrow
            if (action === 'supply' && account) {
                const fresh = await API.getAccount(account).catch(() => null);
                const liquidityUsd = fresh?.liquidityUsd ?? fresh?.liquidity;
                const hasSupply = fresh?.positions?.some((p) => getPositionBalance(p, 'supplyUnderlying') > 0);
                if (hasSupply && (liquidityUsd == null || liquidityUsd === 0)) {
                    const comp = comptroller ?? (await API.getContractAddresses().then((r) => r.comptroller ?? null).catch(() => null));
                    if (comp && fresh?.positions) {
                        const marketsToEnter = fresh.positions.filter((p) => getPositionBalance(p, 'supplyUnderlying') > 0).map((p) => p.market);
                        if (marketsToEnter.length > 0) {
                            const Web3Service = (await import('./services/web3')).default;
                            await Web3Service.enterMarkets(comp, marketsToEnter);
                            await refetchAccount();
                        }
                    }
                }
            }
            // Poll once more so balance/value/APY are up to date before showing Positions
            await new Promise((r) => setTimeout(r, 2000));
            if (account)
                await refetchAccount();
            if (action === 'supply' || action === 'borrow')
                navigate('/lending/positions');
        }
        catch (e) {
            setRefetchError(e instanceof Error ? e.message : 'Failed to refresh data');
        }
    };
    // TVL = sum of each market's total supply in USD (backend sends totalSupplyUsd in plain USD)
    const totalTVL = markets.reduce((sum, m) => sum + getMarketSupplyUsd(m), 0);
    const avgSupply = markets.length ? markets.reduce((s, m) => s + (m.supplyRatePerYear ?? 0), 0) / markets.length : 0;
    const avgBorrow = markets.length ? markets.reduce((s, m) => s + (m.borrowRatePerYear ?? 0), 0) / markets.length : 0;
    const pct = (n) => (n < 1 ? n * 100 : n).toFixed(2);
    return (_jsxs("div", { className: "min-h-screen bg-zinc-950 text-zinc-100", children: [_jsx(Header, { account: account, isConnected: isConnected, chainId: chainId, isWrongNetwork: isWrongNetwork, expectedChainId: expectedChainId, expectedNetwork: expectedNetwork, onSwitchNetwork: switchNetwork, switchingNetwork: switchingNetwork, onConnect: connect, onDisconnect: disconnect }), _jsxs("main", { className: "mx-auto max-w-6xl px-4 py-6 sm:px-6", children: [isConnected && isWrongNetwork && (_jsxs("div", { className: "mb-4 flex items-center justify-between gap-4 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-amber-200 text-sm", children: [_jsxs("span", { children: ["Wallet is on chain ", chainId, ". Please switch to ", expectedNetwork, " (chain ", expectedChainId, ")."] }), _jsx("button", { type: "button", onClick: switchNetwork, disabled: switchingNetwork, className: "shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-500 disabled:opacity-50", children: switchingNetwork ? 'Switching...' : `Switch to ${expectedNetwork}` })] })), refetchError && (_jsxs("div", { className: "mb-4 flex items-center justify-between gap-4 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-amber-200 text-sm", children: [_jsxs("span", { children: [refetchError, ". Please click Refresh to retry."] }), _jsx("button", { type: "button", onClick: refetch, className: "shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-500", children: "Refresh" })] })), _jsxs("div", { className: "mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4", children: [_jsx("div", { className: "text-xs text-zinc-500", children: "TVL" }), _jsx("div", { className: "mt-0.5 text-2xl font-semibold text-white", children: formatTvl(totalTVL) }), _jsx("button", { type: "button", onClick: refetch, className: "mt-2 text-xs text-zinc-500 underline hover:text-zinc-300", children: "Refresh" })] }), _jsxs("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4", children: [_jsx("div", { className: "text-xs text-zinc-500", children: "Avg Supply APY" }), _jsxs("div", { className: "mt-0.5 text-2xl font-semibold text-emerald-400", children: [pct(avgSupply), "%"] })] }), _jsxs("div", { className: "rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4", children: [_jsx("div", { className: "text-xs text-zinc-500", children: "Avg Borrow APY" }), _jsxs("div", { className: "mt-0.5 text-2xl font-semibold text-amber-400", children: [pct(avgBorrow), "%"] })] })] }), _jsxs("div", { className: "space-y-6", children: [activeTab === 'markets' && (_jsxs("section", { children: [_jsx("h2", { className: "mb-4 text-xl font-semibold text-white", children: "Lending Markets" }), _jsx(MarketsTable, { markets: markets, loading: marketsLoading, error: marketsError, onRetry: refetch, onSupply: handleSupply, onBorrow: handleBorrow })] })), activeTab === 'positions' && (_jsxs("section", { children: [_jsx("h2", { className: "mb-4 text-xl font-semibold text-white", children: "My Positions" }), _jsx(UserPositions, { account: accountData, loading: accountLoading, connected: isConnected, markets: markets, onWithdraw: handleWithdraw, onRepay: handleRepay, comptrollerAddress: comptroller, onRefetch: refetchAccount })] }))] })] }), _jsx(ActionModal, { isOpen: modalOpen, onClose: () => setModalOpen(false), action: action, market: selectedMarket, onSuccess: handleModalSuccess, maxAmount: maxAmount, comptrollerAddress: comptroller })] }));
}
export default LendingApp;
