# Upgradable DeFi Frontend

React + Vite frontend for the Upgradable DeFi protocol.

This app includes two product surfaces:
- `Lending` (markets, positions, supply/borrow/repay/withdraw)
- `Mining` (pools, stake/withdraw/claim rewards)

## Requirements

- Node.js 18+
- Running backend API (`http://127.0.0.1:8000` for local default proxy)
- MetaMask (or compatible EVM wallet)

## Install

```bash
cd frontend
npm install
```

## Configuration

Frontend runtime config is read in this order:
1. Repo root `/.env_example` (`VITE_*` keys)
2. `frontend/.env` fallback
3. Built-in defaults in `frontend/vite.config.ts`

### Supported frontend env vars

```env
VITE_API_URL=/api
VITE_NETWORK=sepolia
VITE_ANVIL_RPC_URL=http://127.0.0.1:8545
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

### Network switch

Set in `/.env_example`:

- `VITE_NETWORK=anvil` for chain `31337`
- `VITE_NETWORK=sepolia` for chain `11155111`

The app validates wallet chain and shows a `Switch to ...` action when wallet network does not match the configured target network.

## Run (Development)

```bash
npm run dev
```

Default URL: `http://localhost:5173`

Vite proxies `/api/*` to backend based on `VITE_API_URL`.
- If `VITE_API_URL=/api`, proxy target is `http://localhost:8000`
- If `VITE_API_URL` is an absolute URL, proxy uses that URL

## Backend dependency

Frontend pages rely on backend endpoints such as:
- `GET /markets`
- `GET /contracts/addresses`
- `GET /protocol/upgrade-info`
- `GET /accounts/{address}`
- `GET /liquidity-mining`

If backend is not running, frontend will show request errors.

## Current UX behavior

- Lending markets load once on page entry.
- Markets refresh only when user clicks `Refresh`.
- While refresh is in progress, UI shows non-blocking `Refreshing markets...` status.
- Token address row supports one-click `Copy` for market assets (e.g. WETH/USDC underlying addresses).

## Sepolia latency note

On Sepolia, some backend calls can take 10-30s due on-chain RPC latency. Frontend API clients are configured with longer timeouts to avoid premature cancellation.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run type-check
```

## Vercel deployment

For Vercel deployment steps (frontend + backend), see:

- `../DEPLOY_GUIDE.md`

## Project structure (high level)

- `src/lending/*` Lending UI, hooks, and services
- `src/mining/*` Mining UI, hooks, and services
- `src/config/network.ts` target chain config + wallet network switching
- `src/ProtocolUpgradeInfo.tsx` upgradeability metadata panel
- `vite.config.ts` env resolution and API proxy behavior
