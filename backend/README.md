# backend

FastAPI + web3.py + SQLite 后端，用于本地 anvil(31337) 合约读数与查询。

## 环境要求
- Python 3.9
- 本地 anvil 节点：`http://127.0.0.1:8545`

## 快速开始
```bash
cd /Users/liuruyan/Desktop/course/6107/upgradable_defi/backend
python3.9 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export ABI_ROOT=/Users/liuruyan/Desktop/course/6107/upgradable_defi/contracts/out
uvicorn app.main:app --reload
```

## Vercel 部署

已支持 Vercel Serverless 运行模式。完整步骤见仓库根目录：

- `DEPLOY_GUIDE.md`

## 配置
地址文件：`config/addresses.local.json`
```json
{
  "comptroller": "0x0000000000000000000000000000000000000000",
  "markets": [],
  "liquidityMining": [],
  "priceOracle": "0x0000000000000000000000000000000000000000"
}
```

ABI 自动从 `../contracts/out/` 查找并读取（`abi` 字段）。

## 测试与验证
运行 API 测试脚本（默认使用 anvil 账号 0 地址）：
```bash
python test_api.py
```

看到如下结果说明合约数据已读到：
- `/markets` 中包含 `symbol`、`price` 等字段且非空
- `/markets/summary` 返回 4 个 USD 聚合字段
- `/liquidity-mining` 返回两条挖矿池记录

运行链上动作测试（会执行 supply/borrow/stake）：
```bash
# 需要提前设置治理代币地址
export GOV_TOKEN=0x...
python test_actions.py
```

预期输出：
```
On-chain actions completed.
```

再运行 `python test_api.py`，你会看到类似格式的数据：

**/markets**
```json
{
  "items": [
    {
      "market": "0x...",
      "underlying": "0x...",
      "symbol": "USDC",
      "decimals": 18,
      "totalSupply": 2000000000000000000000,
      "totalBorrows": 100000000000000000000,
      "totalReserves": 0,
      "cash": 1900000000000000000000,
      "exchangeRate": 1000000000000000000,
      "utilization": 0.05,
      "borrowRatePerYear": 24999999981264000,
      "supplyRatePerYear": 1125000000576000,
      "price": 100000000,
      "collateralFactor": 750000000000000000,
      "isListed": true
    }
  ]
}
```

**/markets/summary**
```json
{
  "totalSupplyUsd": "5000.000000",
  "totalEarningUsd": "2.250000",
  "totalBorrowUsd": "100.000000",
  "totalCollateralUsd": "3900.000000",
  "asOf": 1770464426
}
```

**/liquidity-mining**
```json
{
  "items": [
    {
      "mining": "0x...",
      "stakingToken": "0x...",
      "stakingSymbol": "dUSDC",
      "stakingDecimals": 18,
      "rewardsToken": "0x...",
      "rewardsSymbol": "GOV",
      "rewardsDecimals": 18,
      "rewardRate": 11574074074074074,
      "totalStaked": 500000000000000000000,
      "rewardPerToken": 2824074074074074,
      "rewardsDuration": 2592000,
      "periodFinish": 1773056299,
      "lastTimeRewardApplicable": 1770464421
    }
  ]
}
```

## API
- `GET /health`
- `GET /contracts/addresses`
- `GET /markets`
- `GET /markets/summary`
- `GET /markets/timeseries?from=&to=&interval=`
- `GET /accounts/{address}?market=`
- `GET /account/overview?account=`
- `GET /account/wallet?account=&assets=`
- `GET /liquidity-mining`
- `GET /liquidity-mining/{address}`

### API 说明
- `GET /health`：链与索引状态（chainId、latestBlock、indexedToBlock）。
- `GET /contracts/addresses`：返回后端当前使用的实时部署地址（`comptroller`、`priceOracle`、`markets`、`liquidityMining`）以及 `marketDetails`/`liquidityMiningDetails` 映射，供前端运行时动态读取。支持 `refresh=true` 触发重新扫描部署地址并即时刷新。
- `GET /markets`：市场汇总（供给/借款/利率/利用率/价格/抵押系数）。
- `GET /markets/summary`：市场顶部聚合指标（总供给/赚取/借款/抵押，USD）。
- `GET /markets/timeseries`：按天/小时聚合（默认最近 30 天，当前为静态快照）。
- `GET /accounts/{address}`：用户头寸（供给/借款/健康度），支持 `market` 仅返回指定市场。
- `GET /account/overview`：用户概览（净 APR、借款能力、可借额度）。
- `GET /account/wallet`：钱包余额（按资产过滤，返回余额与价格）。
- `GET /liquidity-mining`：挖矿池汇总（质押/奖励 token、总质押、奖励速率）。
- `GET /liquidity-mining/{address}`：用户在各挖矿池的质押与收益。
- 代币数量字段（如 `balance`、`supplyUnderlying`、`borrowBalance`、`totalStaked`、`stakedBalance`、`earned`、`govBalance`）均已按 `decimals` 转成可读数量（非原始链上整数）。
- 比例/系数字段（如 `exchangeRate`、`collateralFactor`、`rewardPerToken`）已按 `1e18`（WAD）转成可读小数。

## 备注
- 运行流程（联调时链要保持开启）：
  1. 启动本地链：`anvil`
  2. 部署合约：`upgradable_defi/contracts/script/deploy_local.sh`
  3. 启动后端：`uvicorn app.main:app --reload`
- 地址加载优先级：
  - 默认自动扫描 `contracts/broadcast/*/run-latest.json` 并提取 `comptroller/markets/liquidityMining/priceOracle`。
  - 若自动扫描失败，则回退到 `backend/config/addresses.local.json`。
- 如果关闭 anvil，链上读数会失败或变为 `null/0`。
- 默认从 `latest-2000` 开始索引（如无 `state.lastProcessedBlock`）。
- 可通过环境变量修改：
  - `RPC_URL`（默认 `http://127.0.0.1:8545`）
  - `DB_PATH`（默认 `backend/indexer.db`）
  - `POLL_INTERVAL`（默认 `5` 秒）
  - `BATCH_SIZE`（默认 `1000`）
  - `MARKET_ABI_NAME`（默认 `LendingToken`）
  - `COMPTROLLER_ABI_NAME`（默认 `Comptroller`）
  - `LIQUIDITY_MINING_ABI_NAME`（默认 `LiquidityMining`）
  - `AUTO_DISCOVER_ADDRESSES`（默认 `1`，设为 `0` 可关闭自动发现）
  - `RUN_JSON`（可显式指定 broadcast run json 路径）

## Position 无数据排查（合约侧无问题时的检查项）

合约中 `balanceOf`（供应）和 `borrowBalanceStored`（借款）逻辑正确；若接口 `GET /accounts/{address}` 返回的 position 全为 0 或前端显示「暂无头寸」，请按下面排查：

1. **链与 RPC 一致**  
   后端读的是 `RPC_URL`（默认本机 8545）。若 MetaMask 连的是别的网络（如主网、其他测试网），你在前端 Supply 会写到你连的那条链，而后端读的是 8545 那条链，自然读不到头寸。  
   - 确认：MetaMask 网络与后端一致（如本地 31337），或把后端 `RPC_URL` 指到同一链。

2. **合约地址一致**  
   后端用 `config/addresses.local.json` 或 broadcast 的 `run-latest.json` 里的 **markets** 列表去调每个 LendingToken 的 `balanceOf(addr)`。若你部署过新合约但没更新后端配置，后端仍在读旧地址，会得到 0。  
   - 确认：`GET /contracts/addresses` 返回的 `markets` / `marketDetails` 与当前前端实际调用的 LendingToken 地址一致（可与部署脚本或 broadcast 输出对比）。

3. **markets 非空**  
   若配置里 `markets: []` 或自动发现没拿到任何 LendingToken，`get_account` 会返回 `positions: []`，前端就会显示「暂无头寸」。  
   - 确认：`GET /contracts/addresses` 里 `markets` 至少有 1 个地址；必要时补全 `addresses.local.json` 或检查 broadcast 中 LendingToken 代理地址是否被正确解析。

4. **确实有过 Supply 且成功**  
   供应会调用 LendingToken 的 `mint()`，链上会增加该地址的 cToken `balanceOf`。若交易失败、未上链或只 approve 未 mint，链上余额为 0。  
   - 确认：在区块浏览器或 cast 查该地址在对应 LendingToken 上的 `balanceOf` 是否 > 0。

5. **请求的地址与钱包一致**  
   前端用当前连接的钱包地址请求 `GET /accounts/{address}`。若曾切换账户或复制错地址，会查到别人或空地址。  
   - 确认：F12 看请求 URL 里的 address 是否为当前 MetaMask 账户（checksum 格式无妨，后端会统一）。

**快速验证**（本机）：  
- `GET /health` 看 `chainId` 与 MetaMask 是否一致。  
- `GET /contracts/addresses` 看 `markets` 是否有地址且与部署一致。  
- `GET /accounts/<你的钱包地址>` 看返回的 `positions` 条数是否等于 markets 数量，以及对应市场的 `supplyUnderlying` / `borrowBalance` 是否仍为 0。
