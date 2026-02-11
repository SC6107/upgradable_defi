/**
 * Lending Web3 Service
 * Extends Web3Base with lending-specific blockchain operations.
 */
import { ethers } from 'ethers';
import { Web3Base, ERC20_ABI } from '@/shared/services/web3Base';

const LENDING_TOKEN_ABI = [
  'function mint(uint256 mintAmount) external returns (uint256)',
  'function redeem(uint256 redeemTokens) external returns (uint256)',
  'function redeemUnderlying(uint256 redeemAmount) external returns (uint256)',
  'function borrow(uint256 borrowAmount) external returns (uint256)',
  'function repayBorrow(uint256 repayAmount) external returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function borrowBalanceCurrent(address account) view returns (uint256)',
  'function exchangeRateCurrent() view returns (uint256)',
  'function underlying() view returns (address)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function supplyRatePerBlock() view returns (uint256)',
  'function borrowRatePerBlock() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function getCash() view returns (uint256)',
  'function liquidateBorrow(address borrower, uint256 repayAmount, address cTokenCollateral) external returns (uint256)',
];

const COMPTROLLER_ABI = [
  'function enterMarkets(address[] calldata cTokens) external returns (uint256[])',
  'function exitMarket(address cTokenAddress) external returns (uint256)',
  'function getAccountLiquidity(address account) view returns (uint256, uint256)',
  'function getAllMarkets() view returns (address[])',
  'function markets(address) view returns (bool, uint256)',
];

class LendingWeb3Service extends Web3Base {
  async supply(
    marketAddress: string,
    amount: string,
    underlyingAddress: string,
    comptrollerAddress?: string | null
  ): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
    const decimals = await underlyingContract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    await this.ensureAllowance(underlyingAddress, marketAddress, amountWei);

    const lendingContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);
    const mintTx = await lendingContract.mint(amountWei);
    const receipt = await mintTx.wait();

    if (comptrollerAddress) {
      await this.enterMarkets(comptrollerAddress, [marketAddress]);
    }

    return receipt.hash;
  }

  async withdraw(marketAddress: string, amount: string, isUnderlying: boolean = true): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const lendingContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);

    let tx;
    if (isUnderlying) {
      const underlyingAddress = await lendingContract.underlying();
      const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
      const decimals = await underlyingContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      tx = await lendingContract.redeemUnderlying(amountWei);
    } else {
      const decimals = await lendingContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      tx = await lendingContract.redeem(amountWei);
    }

    const receipt = await tx.wait();
    return receipt.hash;
  }

  async borrow(marketAddress: string, amount: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const lendingContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);
    const underlyingAddress = await lendingContract.underlying();
    const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
    const decimals = await underlyingContract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    const borrowTx = await lendingContract.borrow(amountWei);
    const receipt = await borrowTx.wait();

    return receipt.hash;
  }

  async repay(marketAddress: string, amount: string, underlyingAddress: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
    const decimals = await underlyingContract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    await this.ensureAllowance(underlyingAddress, marketAddress, amountWei);

    const lendingContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);
    const repayTx = await lendingContract.repayBorrow(amountWei);
    const receipt = await repayTx.wait();

    return receipt.hash;
  }

  async enterMarkets(comptrollerAddress: string, marketAddresses: string[]): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const comptroller = new ethers.Contract(comptrollerAddress, COMPTROLLER_ABI, this.signer);
    const tx = await comptroller.enterMarkets(marketAddresses);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  async exitMarket(comptrollerAddress: string, marketAddress: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const comptroller = new ethers.Contract(comptrollerAddress, COMPTROLLER_ABI, this.signer);
    const tx = await comptroller.exitMarket(marketAddress);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  async getUnderlyingBalance(underlyingAddress: string): Promise<string> {
    if (!this.signer || !this.account) throw new Error('Wallet not connected');

    const contract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
    const balance = await contract.balanceOf(this.account);
    const decimals = await contract.decimals();

    return ethers.formatUnits(balance, decimals);
  }

  async getLendingTokenBalance(marketAddress: string): Promise<string> {
    if (!this.signer || !this.account) throw new Error('Wallet not connected');

    const contract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);
    const balance = await contract.balanceOf(this.account);
    const decimals = await contract.decimals();

    return ethers.formatUnits(balance, decimals);
  }

  async liquidateBorrow(
    repayCTokenAddress: string,
    borrower: string,
    repayAmount: string,
    collateralCTokenAddress: string,
    underlyingAddress: string
  ): Promise<string> {
    if (!this.signer || !this.account) throw new Error('Wallet not connected');

    const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
    const decimals = await underlyingContract.decimals();
    const amountWei = ethers.parseUnits(repayAmount, decimals);

    await this.ensureAllowance(underlyingAddress, repayCTokenAddress, amountWei);

    const repayContract = new ethers.Contract(repayCTokenAddress, LENDING_TOKEN_ABI, this.signer);
    const tx = await repayContract.liquidateBorrow(borrower, amountWei, collateralCTokenAddress);
    const receipt = await tx.wait();

    return receipt!.hash;
  }
}

export default new LendingWeb3Service();
