/**
 * Lending API Service
 * Handles all API calls for lending markets and user data
 */
import axios from 'axios';
import { getAddress } from 'ethers';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    // Sepolia reads can exceed 10s due multiple on-chain RPC calls.
    timeout: 60000,
});
function _num(v) {
    if (v == null)
        return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
class LendingAPIService {
    /**
     * Get system health status
     */
    async getHealth() {
        const response = await apiClient.get('/health');
        return response.data;
    }
    /**
     * Get all lending markets
     */
    async getMarkets() {
        const response = await apiClient.get('/markets');
        return response.data?.items ?? [];
    }
    /**
     * Get account data including positions and health.
     * Expects backend to return human units: supplyUnderlying/borrowBalance (token amount),
     * price/priceUsd (USD per token). Value USD = balance × price (plain USD).
     */
    async getAccount(address) {
        const checksummed = getAddress(address);
        const response = await apiClient.get(`/accounts/${checksummed}`);
        const data = response.data;
        let positions = data.positions || [];
        // Normalize: ensure camelCase and numbers (backend may send snake_case or null)
        positions = positions.map((pos) => {
            const supplyUnderlying = _num(pos.supplyUnderlying ?? pos.supply_underlying ?? 0);
            const borrowBalance = _num(pos.borrowBalance ?? pos.borrow_balance ?? 0);
            const price = _num(pos.price ?? pos.priceUsd ?? pos.price_usd ?? 0);
            const supplyRatePerYear = _num(pos.supplyRatePerYear ?? pos.supply_rate_per_year);
            const borrowRatePerYear = _num(pos.borrowRatePerYear ?? pos.borrow_rate_per_year);
            const supplyAprPct = _num(pos.supplyAprPct ?? pos.supply_apr_pct);
            const borrowAprPct = _num(pos.borrowAprPct ?? pos.borrow_apr_pct);
            const collateralFactor = _num(pos.collateralFactor ?? pos.collateral_factor);
            return {
                ...pos,
                supplyUnderlying,
                borrowBalance,
                price: Number.isFinite(price) ? price : 0,
                priceUsd: Number.isFinite(price) ? price : 0,
                supplyRatePerYear: Number.isFinite(supplyRatePerYear) ? supplyRatePerYear : 0,
                borrowRatePerYear: Number.isFinite(borrowRatePerYear) ? borrowRatePerYear : 0,
                supplyAprPct: Number.isFinite(supplyAprPct) ? supplyAprPct : 0,
                borrowAprPct: Number.isFinite(borrowAprPct) ? borrowAprPct : 0,
                collateralFactor: Number.isFinite(collateralFactor) ? collateralFactor : 0,
            };
        });
        // Prefer backend totals (totalSuppliedUsd/totalBorrowedUsd) when present for sync with Positions
        const totalSupplied = typeof data.totalSuppliedUsd === 'number' &&
            Number.isFinite(data.totalSuppliedUsd)
            ? data.totalSuppliedUsd
            : positions.reduce((sum, pos) => {
                const price = pos.price ?? pos.priceUsd ?? 0;
                return sum + (pos.supplyUnderlying ?? 0) * price;
            }, 0);
        const totalBorrowed = typeof data.totalBorrowedUsd === 'number' &&
            Number.isFinite(data.totalBorrowedUsd)
            ? data.totalBorrowedUsd
            : positions.reduce((sum, pos) => {
                const price = pos.price ?? pos.priceUsd ?? 0;
                return sum + (pos.borrowBalance ?? 0) * price;
            }, 0);
        const borrowLimitFromPositions = positions.reduce((sum, pos) => {
            const price = pos.price ?? pos.priceUsd ?? 0;
            const supplyValue = (pos.supplyUnderlying ?? 0) * price;
            return sum + supplyValue * (pos.collateralFactor ?? 0);
        }, 0);
        const liquidityUsd = data.liquidityUsd ?? data.liquidity;
        // When user hasn't entered markets or chain returns 0, liquidity is 0 but we still use theoretical limit from collateral
        const borrowLimit = typeof liquidityUsd === 'number' && liquidityUsd > 0
            ? totalBorrowed + liquidityUsd
            : borrowLimitFromPositions;
        // Use chain liquidity when > 0; otherwise fall back to theoretical (borrowLimit - totalBorrowed) so borrow works after supply
        const availableToBorrow = typeof liquidityUsd === 'number' && liquidityUsd > 0
            ? liquidityUsd
            : Math.max(0, borrowLimit - totalBorrowed);
        return {
            ...data,
            positions,
            totalSupplied,
            totalBorrowed,
            borrowLimit,
            availableToBorrow,
        };
    }
    /**
     * Get transaction events
     */
    async getEvents(contract, event, account, fromBlock, toBlock, limit = 100) {
        const params = new URLSearchParams();
        if (contract)
            params.append('contract', contract);
        if (event)
            params.append('event', event);
        if (account)
            params.append('account', account);
        if (fromBlock)
            params.append('fromBlock', fromBlock.toString());
        if (toBlock)
            params.append('toBlock', toBlock.toString());
        params.append('limit', limit.toString());
        const response = await apiClient.get('/events', { params });
        return response.data.items || [];
    }
    /**
     * Get market statistics
     */
    async getMarketStats(marketAddress) {
        const response = await apiClient.get(`/markets/${marketAddress}/stats`);
        return response.data;
    }
    /**
     * Get protocol contract addresses (comptroller for enterMarkets)
     */
    async getContractAddresses() {
        const response = await apiClient.get('/contracts/addresses');
        return response.data ?? {};
    }
}
export default new LendingAPIService();
