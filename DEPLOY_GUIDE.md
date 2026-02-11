# Vercel Deploy Guide (Frontend + Backend)

This repo should be deployed as **two Vercel projects**:
- `upgradable-defi-backend` (FastAPI)
- `upgradable-defi-frontend` (Vite + React)

## 1. Deploy backend

Create a Vercel project with these settings:
- **Root Directory**: `backend`
- **Framework Preset**: `Other`
- **Install Command**: leave default
- **Build Command**: leave default

Set backend environment variables in Vercel:

```bash
NETWORK=sepolia
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<YOUR_KEY>
AUTO_DISCOVER_ADDRESSES=1
ENABLE_INDEXER=0
ALLOWED_ORIGINS=https://<your-frontend-domain>
```

Optional backend envs (only if you want explicit artifact paths):

```bash
RUN_JSON=contracts/broadcast/FullSetupLocal.s.sol/11155111/run-latest.json
ABI_ROOT=contracts/out
BROADCAST_ROOT=contracts/broadcast
```

Deploy:

```bash
vercel --cwd backend
vercel --cwd backend --prod
```

Quick check after deploy:
- `https://<backend-domain>/health`
- `https://<backend-domain>/contracts/addresses`

## 2. Deploy frontend

Create a second Vercel project with these settings:
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`

Set frontend environment variables in Vercel:

```bash
VITE_API_URL=https://<backend-domain>
VITE_NETWORK=sepolia
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

Deploy:

```bash
vercel --cwd frontend
vercel --cwd frontend --prod
```

## 3. Final wiring

After frontend domain is final, update backend CORS:
- Set `ALLOWED_ORIGINS` to your real frontend domain.
- Re-deploy backend.

If you add a custom frontend domain, update `ALLOWED_ORIGINS` again and redeploy backend.

## Notes

- On Vercel, backend defaults are serverless-safe in this repo:
  - DB path defaults to `/tmp/indexer.db`
  - indexer defaults to disabled (`ENABLE_INDEXER=0` behavior on Vercel)
- If you need local indexer behavior, run backend locally without `VERCEL=1` (or set `ENABLE_INDEXER=1`).
