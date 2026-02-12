# Upgradable DeFi

Upgradable lending + liquidity mining protocol with governance-controlled upgrades.

## Project Overview

This project is a demo DeFi protocol with:

- Upgradeable smart contracts (UUPS proxy pattern) for lending, mining, and governance modules.
- A FastAPI backend that reads on-chain data and serves protocol/account APIs.
- A React frontend where users can supply, borrow, repay, withdraw, stake, and claim rewards.

Upgrades are executed through `ProtocolGovernor` + `ProtocolTimelock` to simulate real governance-controlled protocol changes.

## Documentation

- Backend README: [backend/README.md](./backend/README.md)
- Frontend README: [frontend/README.md](./frontend/README.md)
- Contracts README: [contracts/README.md](./contracts/README.md)

## Sepolia Contract Addresses

All addresses below are clickable Sepolia links.

| # | Contract | Proxy | Implementation | Notes |
|---|---|---|---|---|
| 1 | PriceOracle | [`0x8828b6d6fe69be46b774624cd60fafc84a1b0d4c`](https://sepolia.etherscan.io/address/0x8828b6d6fe69be46b774624cd60fafc84a1b0d4c) | [`0xbF11717Dd193962be0BC2C4606Ca633fbc2Fd4e5`](https://sepolia.etherscan.io/address/0xbF11717Dd193962be0BC2C4606Ca633fbc2Fd4e5) |  |
| 2 | Comptroller | [`0xca4e33d00b3b706a790abc17eaa69f797f7f3ad9`](https://sepolia.etherscan.io/address/0xca4e33d00b3b706a790abc17eaa69f797f7f3ad9) | [`0x9afB96F3296ffe9f9c787A6F397E4671b88e01CE`](https://sepolia.etherscan.io/address/0x9afB96F3296ffe9f9c787A6F397E4671b88e01CE) |  |
| 3 | LendingToken | [`0x53bad4161a468c825d60d7e45fd655badc49d874`](https://sepolia.etherscan.io/address/0x53bad4161a468c825d60d7e45fd655badc49d874) | [`0x1114d4Ffe19FDAe53F22e0a28Aa5835bb5f9A7f2`](https://sepolia.etherscan.io/address/0x1114d4Ffe19FDAe53F22e0a28Aa5835bb5f9A7f2) | dUSDC |
| 4 | LendingToken | [`0x72783425278485ea719f28b933456cb623bb3344`](https://sepolia.etherscan.io/address/0x72783425278485ea719f28b933456cb623bb3344) | [`0x02f639216D8228A47BDC9F70185B19Ca2c61F1eb`](https://sepolia.etherscan.io/address/0x02f639216D8228A47BDC9F70185B19Ca2c61F1eb) | dWETH |
| 5 | GovernanceToken | [`0xc77227a386df9a1bee4afe0b5a7e5d19beb85f0e`](https://sepolia.etherscan.io/address/0xc77227a386df9a1bee4afe0b5a7e5d19beb85f0e) | [`0x5A04558A3bA45efaE1B134242C888eaf167D0618`](https://sepolia.etherscan.io/address/0x5A04558A3bA45efaE1B134242C888eaf167D0618) |  |
| 6 | ProtocolTimelock | [`0x8a6836b86df5c2b004b88392758856a607a5057d`](https://sepolia.etherscan.io/address/0x8a6836b86df5c2b004b88392758856a607a5057d) | [`0xaa22DA06d6DAC13c8e729D950b8d310d099c568a`](https://sepolia.etherscan.io/address/0xaa22DA06d6DAC13c8e729D950b8d310d099c568a) |  |
| 7 | ProtocolGovernor | [`0x6f83b9a65799f04bedc116b156fa45e3cfbcc270`](https://sepolia.etherscan.io/address/0x6f83b9a65799f04bedc116b156fa45e3cfbcc270) | [`0x338d114cDCd3e72563503FD9269e1ba5BDC62187`](https://sepolia.etherscan.io/address/0x338d114cDCd3e72563503FD9269e1ba5BDC62187) |  |
| 8 | LiquidityMining | [`0x74155c77bea0c4487e75b32269cc1e72f8b10c3d`](https://sepolia.etherscan.io/address/0x74155c77bea0c4487e75b32269cc1e72f8b10c3d) | [`0x98b61084bea1D5D63Cc1Bbbcd2B79A78B30C2378`](https://sepolia.etherscan.io/address/0x98b61084bea1D5D63Cc1Bbbcd2B79A78B30C2378) | for dUSDC market |
| 9 | LiquidityMining | [`0x34f2faab41745b291e572bbf5b89075f0c5d0ce8`](https://sepolia.etherscan.io/address/0x34f2faab41745b291e572bbf5b89075f0c5d0ce8) | [`0x774a89D19dC25d3082Ec8d71082D44E3e0726dAf`](https://sepolia.etherscan.io/address/0x774a89D19dC25d3082Ec8d71082D44E3e0726dAf) | for dWETH market |

## Demo

- Frontend: [http://46.51.218.96:5173/lending/markets](http://46.51.218.96:5173/lending/markets)

## Demo Videos

- Liquid: [https://www.youtube.com/watch?v=T_jjijITTDs](https://www.youtube.com/watch?v=T_jjijITTDs)
- Lending protocol: [https://www.youtube.com/watch?v=61oLn6XGD-8](https://www.youtube.com/watch?v=61oLn6XGD-8)

## Governance Upgrade Execution Example

- BlockSec Phalcon (Sepolia tx): [https://app.blocksec.com/phalcon/explorer/tx/sepolia/0x4f608e0f32985a44a8dd92fd1ef8502636bb916f65b6bd93a84682237092de1c](https://app.blocksec.com/phalcon/explorer/tx/sepolia/0x4f608e0f32985a44a8dd92fd1ef8502636bb916f65b6bd93a84682237092de1c)
