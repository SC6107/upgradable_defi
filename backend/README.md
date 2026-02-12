# Upgradable DeFi Backend

FastAPI + web3.py backend for protocol read APIs and a lightweight SQLite indexer.

## Requirements

- Python 3.9+
- Access to an EVM RPC (`anvil` or Sepolia)
- Contract artifacts in `contracts/out` and deployment artifacts in `contracts/broadcast`

## Quick start

Run from `backend/`:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger and ReDoc:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/redoc`

## Configuration

Backend reads repo root `.env` automatically (`../.env` from `backend/app/config.py`).

Key environment variables:

- `NETWORK`: `anvil` or `sepolia` (default: `sepolia`)
- `RPC_URL`: explicit RPC override (if unset, derived from `NETWORK`)
- `ANVIL_RPC_URL`: default `http://127.0.0.1:8545`
- `SEPOLIA_RPC_URL`: Sepolia RPC URL
- `DEPLOY_CHAIN_ID`: defaults to `31337` (`anvil`) or `11155111` (`sepolia`)
- `RUN_JSON`: explicit deployment artifact path override
- `AUTO_DISCOVER_ADDRESSES`: `1` (default) or `0`
- `DB_PATH`: default `backend/indexer.db`
- `POLL_INTERVAL`: default `5`
- `BATCH_SIZE`: default `1000`

Address loading order:

1. Broadcast artifact (default `contracts/broadcast/FullSetupLocal.s.sol/<DEPLOY_CHAIN_ID>/run-latest.json`)
2. Fallback file `backend/config/addresses.local.json` (if present)

Optional fallback file format:

```json
{
  "comptroller": "0x...",
  "markets": ["0x..."],
  "liquidityMining": ["0x..."],
  "priceOracle": "0x...",
  "governor": "0x...",
  "protocolTimelock": "0x..."
}
```

## API endpoints

- `GET /health`
- `GET /contracts/addresses`
- `GET /contracts/addresses?refresh=true`
- `GET /protocol/upgrade-info`
- `GET /markets`
- `GET /markets/summary`
- `GET /accounts/{address}`
- `GET /accounts/{address}?market=0x...`
- `GET /account/overview?account=0x...`
- `GET /account/wallet?account=0x...&assets=USDC,WETH`
- `GET /liquidity-mining`
- `GET /liquidity-mining/{address}`

## Validation scripts

From `backend/`:

```bash
python test_api.py
```

This checks all primary read endpoints.

For end-to-end on-chain actions (`supply`, `borrow`, `stake`):

```bash
export GOV_TOKEN=0x...
python test_actions.py
```

Expected success output:

```text
On-chain actions completed.
```

Pure unit tests:

```bash
pytest test_chain.py
```

## Local dev flow

1. Start chain: `anvil`
2. Deploy contracts (repo root): `./contracts/script/deploy_local.sh`
3. Start backend: `uvicorn app.main:app --reload` (inside `backend/`)

## Troubleshooting

- Empty positions in `/accounts/{address}`:
  - Ensure wallet chain matches backend `RPC_URL`
  - Ensure `/contracts/addresses` returns the contracts you are interacting with
  - Ensure your supply/borrow txs are confirmed on the same chain
- RPC/indexing issues:
  - Check `/health` (`chainId`, `latestBlock`, `indexedToBlock`)
  - Verify your `.env` values and deployment artifact path
