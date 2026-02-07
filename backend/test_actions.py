import os
from dataclasses import dataclass
from typing import Optional

from web3 import Web3

from app.abi import load_abi
from app.config import RPC_URL, load_addresses


@dataclass
class Keys:
    alice_pk: str
    bob_pk: str


class OnChainTest:
    def __init__(self, keys: Keys):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        self.keys = keys

        addresses = load_addresses()
        self.comptroller = self._checksum(addresses["comptroller"])
        self.markets = [self._checksum(a) for a in addresses["markets"] if a]
        self.liquidity_mining = [self._checksum(a) for a in addresses["liquidityMining"] if a]
        self.gov_token_address = self._checksum(os.getenv("GOV_TOKEN"))
        if not self.gov_token_address:
            raise RuntimeError("Set GOV_TOKEN env var to governance token address")

        self.abi_market = load_abi("LendingToken")
        self.abi_erc20 = load_abi("ERC20")
        self.abi_comptroller = load_abi("Comptroller")
        self.abi_mining = load_abi("LiquidityMining")
        self.abi_gov = load_abi("GovernanceToken")
        self.abi_price_oracle = load_abi("PriceOracle")

    def _acct(self, pk: str):
        return self.w3.eth.account.from_key(pk)

    def _checksum(self, address: Optional[str]) -> Optional[str]:
        if not address:
            return None
        return self.w3.to_checksum_address(address)

    def _send(self, pk: str, to: str, data: bytes, value: int = 0):
        acct = self._acct(pk)
        tx = {
            "from": acct.address,
            "to": to,
            "data": data,
            "value": value,
            "nonce": self.w3.eth.get_transaction_count(acct.address),
            "gas": 800000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": self.w3.eth.chain_id,
        }
        signed = self.w3.eth.account.sign_transaction(tx, pk)
        raw = getattr(signed, "rawTransaction", None) or getattr(signed, "raw_transaction")
        tx_hash = self.w3.eth.send_raw_transaction(raw)
        self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return tx_hash.hex()

    def _send_fn(self, pk: str, fn):
        try:
            data = fn._encode_transaction_data()
        except Exception:
            data = fn.build_transaction({"from": self._acct(pk).address}).get("data")
        to = getattr(fn, "address", None) or getattr(fn, "contract", None).address
        return self._send(pk, to, data)

    def _erc20(self, address: str):
        return self.w3.eth.contract(address=self._checksum(address), abi=self.abi_erc20)

    def _market(self, address: str):
        return self.w3.eth.contract(address=self._checksum(address), abi=self.abi_market)

    def _mining(self, address: str):
        return self.w3.eth.contract(address=self._checksum(address), abi=self.abi_mining)

    def _comptroller(self):
        return self.w3.eth.contract(
            address=self._checksum(self.comptroller), abi=self.abi_comptroller
        )

    def _gov_token(self):
        return self.w3.eth.contract(
            address=self._checksum(self.gov_token_address), abi=self.abi_gov
        )

    def supply_usdc(self, usdc: str, dusdc: str, amount: int):
        dusdc = self._checksum(dusdc)
        token = self._erc20(usdc)
        market = self._market(dusdc)
        self._send_fn(self.keys.alice_pk, token.functions.approve(dusdc, amount))
        self._send_fn(self.keys.alice_pk, market.functions.mint(amount))

    def supply_weth(self, weth: str, dweth: str, amount: int):
        dweth = self._checksum(dweth)
        token = self._erc20(weth)
        market = self._market(dweth)
        self._send_fn(self.keys.alice_pk, token.functions.approve(dweth, amount))
        self._send_fn(self.keys.alice_pk, market.functions.mint(amount))

    def bob_borrow_usdc(self, usdc_market: str, weth_market: str, amount: int):
        usdc_market = self._checksum(usdc_market)
        weth_market = self._checksum(weth_market)
        comptroller = self._comptroller()
        self._send_fn(self.keys.bob_pk, comptroller.functions.enterMarkets([weth_market]))
        market = self._market(usdc_market)
        self._send_fn(self.keys.bob_pk, market.functions.borrow(amount))

    def enable_mining(self, mining: str, stake_token: str, stake_amount: int, reward_amount: int):
        mining = self._checksum(mining)
        stake_token = self._checksum(stake_token)
        gov = self._gov_token()
        mining_contract = self._mining(mining)
        stake = self._erc20(stake_token)
        self._send_fn(self.keys.alice_pk, gov.functions.mint(mining, reward_amount))
        self._send_fn(self.keys.alice_pk, mining_contract.functions.notifyRewardAmount(reward_amount))
        self._send_fn(self.keys.alice_pk, stake.functions.approve(mining, stake_amount))
        self._send_fn(self.keys.alice_pk, mining_contract.functions.stake(stake_amount))


def main():
    keys = Keys(
        alice_pk=os.getenv(
            "ALICE_PK", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        ),
        bob_pk=os.getenv(
            "BOB_PK", "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
        ),
    )

    tester = OnChainTest(keys)

    # Addresses from config
    markets = tester.markets
    mining = tester.liquidity_mining

    if len(markets) < 2 or len(mining) < 2:
        raise RuntimeError("markets/liquidityMining not configured")

    usdc_market = markets[0]
    weth_market = markets[1]

    # Resolve underlying addresses
    usdc = tester._checksum(tester._market(usdc_market).functions.underlying().call())
    weth = tester._checksum(tester._market(weth_market).functions.underlying().call())

    tester.supply_usdc(usdc, usdc_market, 1_000 * 10**18)
    tester.supply_weth(weth, weth_market, int(0.5 * 10**18))
    tester.bob_borrow_usdc(usdc_market, weth_market, 100 * 10**18)

    # Enable mining for USDC and WETH pools
    tester.enable_mining(mining[0], usdc_market, 500 * 10**18, 30_000 * 10**18)
    tester.enable_mining(mining[1], weth_market, int(0.5 * 10**18), 30_000 * 10**18)

    print("On-chain actions completed.")


if __name__ == "__main__":
    main()
