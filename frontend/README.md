# Upgradable DeFi Frontend

React + Vite frontend for the Upgradable DeFi protocol.

## Features

- Lending UI (`/lending/markets`, `/lending/positions`)
- Liquidity mining UI (`/mining/pools`)
- Wallet connect + wrong-network detection + one-click switch
- Manual/automatic refresh flow after transactions
- Backend-driven runtime contract discovery (`/contracts/addresses`)

## Requirements

- Node.js 18+
- npm 9+
- Backend API running (local default: `http://127.0.0.1:8000`)
- MetaMask or compatible EVM wallet

## Install

```bash
cd frontend
npm install
```

## Run (development)

```bash
npm run dev
```

Default URL: `http://localhost:5173`

## Environment configuration

`frontend/vite.config.ts` resolves config in this order:

1. Repo root `.env`
2. `frontend/.env`
3. Repo root `.env_example`
4. Built-in defaults

Supported env vars:

```env
VITE_API_URL=/api
VITE_NETWORK=sepolia
VITE_ANVIL_RPC_URL=http://127.0.0.1:8545
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

Notes:

- `VITE_NETWORK` must be `anvil` or `sepolia`
- `NETWORK`, `ANVIL_RPC_URL`, `SEPOLIA_RPC_URL` from root `.env` can also be used as fallbacks

## API proxy behavior

Vite proxies `/api/*`:

- If `VITE_API_URL=/api`, proxy target is `http://localhost:8000`
- If `VITE_API_URL` is absolute (e.g. `https://api.example.com`), that URL is used as proxy target

## Backend endpoints used by frontend

- `GET /health`
- `GET /contracts/addresses`
- `GET /protocol/upgrade-info`
- `GET /markets`
- `GET /markets/summary`
- `GET /accounts/{address}`
- `GET /account/overview`
- `GET /account/wallet`
- `GET /liquidity-mining`
- `GET /liquidity-mining/{address}`

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run type-check
```

## Project layout

- `src/lending/` lending app UI, hooks, and services
- `src/mining/` liquidity mining app UI, hooks, and services
- `src/shared/` shared API client, hooks, utils, and types
- `src/config/network.ts` chain targeting and wallet network-switch helpers
- `src/App.tsx` top-level router and app switcher
- `vite.config.ts` env resolution and `/api` proxy setup

## Troubleshooting

- "Wrong network" banner:
  - Set `VITE_NETWORK` correctly and switch wallet to that chain
- API request failures:
  - Confirm backend is reachable at expected `VITE_API_URL` target
- Slow responses on Sepolia:
  - Backend RPC calls can take longer; frontend request timeout is set to 60s
