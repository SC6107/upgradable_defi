/**
 * Mining Web3 Service
 * Extends Web3Base with mining-specific blockchain operations.
 */
import { ethers } from 'ethers';
import { Web3Base, ERC20_ABI } from '@/shared/services/web3Base';
import API from './api';

const LENDING_TOKEN_ABI = [
  'function mint(uint256 mintAmount) external',
  'function redeem(uint256 redeemTokens) external',
  'function borrow(uint256 borrowAmount) external',
  'function repayBorrow(uint256 repayAmount) external',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function underlying() view returns (address)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function exchangeRateCurrent() view returns (uint256)',
  'function supplyRatePerBlock() view returns (uint256)',
  'function borrowRatePerBlock() view returns (uint256)',
];

const COMPTROLLER_ABI = [
  'function enterMarkets(address[] calldata cTokens) external returns (uint256[])',
  'function exitMarket(address cTokenAddress) external returns (uint256)',
  'function getAccountLiquidity(address account) view returns (uint256, uint256, uint256)',
  'function getAllMarkets() view returns (address[])',
];

const LIQUIDITY_MINING_ABI = [
  'function stake(uint256 amount) external',
  'function withdraw(uint256 amount) external',
  'function getReward() external',
  'function exit() external',
  'function stakingToken() view returns (address)',
  'function rewardsToken() view returns (address)',
  'function balanceOf(address account) view returns (uint256)',
  'function earned(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

class MiningWeb3Service extends Web3Base {
  async supply(marketAddress: string, amount: string, underlyingAddress: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const underlyingContractProvider = new ethers.Contract(underlyingAddress, ERC20_ABI, this.provider);
    const decimals = await underlyingContractProvider.decimals();

    const amountBN = ethers.parseUnits(amount, decimals);
    const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
    const marketContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);

    const balance = await underlyingContract.balanceOf(this.account);
    if (balance < amountBN) {
      throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, decimals)} tokens`);
    }

    await this.ensureAllowance(underlyingAddress, marketAddress, amountBN);

    const tx = await marketContract.mint(amountBN);
    await tx.wait();

    return tx.hash;
  }

  async redeem(marketAddress: string, amount: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const amountBN = ethers.parseUnits(amount, 18);
    const marketContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);

    const tx = await marketContract.redeem(amountBN);
    await tx.wait();

    return tx.hash;
  }

  async borrow(marketAddress: string, amount: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const amountBN = ethers.parseUnits(amount, 18);
    const marketContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);

    const tx = await marketContract.borrow(amountBN);
    await tx.wait();

    return tx.hash;
  }

  async repay(marketAddress: string, amount: string, underlyingAddress: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const amountBN = ethers.parseUnits(amount, 18);
    const marketContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);

    await this.ensureAllowance(underlyingAddress, marketAddress, amountBN);

    const tx = await marketContract.repayBorrow(amountBN);
    await tx.wait();

    return tx.hash;
  }

  async enterMarkets(markets: string[]): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const contracts = await API.getContractAddresses();
    const comptrollerAddress = contracts.comptroller;
    if (!comptrollerAddress || !ethers.isAddress(comptrollerAddress)) {
      throw new Error('Comptroller address is unavailable from backend API');
    }

    const comptrollerContract = new ethers.Contract(comptrollerAddress, COMPTROLLER_ABI, this.signer);

    const tx = await comptrollerContract.enterMarkets(markets);
    await tx.wait();

    return tx.hash;
  }

  async stake(miningAddress: string, amount: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const amountBN = ethers.parseUnits(amount, 18);
    const miningContract = new ethers.Contract(miningAddress, LIQUIDITY_MINING_ABI, this.signer);

    const stakingToken: string = await miningContract.stakingToken();

    await this.ensureAllowance(stakingToken, miningAddress, amountBN);

    const tx = await miningContract.stake(amountBN);
    await tx.wait();

    return tx.hash;
  }

  async withdraw(miningAddress: string, amount: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const amountBN = ethers.parseUnits(amount, 18);
    const miningContract = new ethers.Contract(miningAddress, LIQUIDITY_MINING_ABI, this.signer);

    const tx = await miningContract.withdraw(amountBN);
    await tx.wait();

    return tx.hash;
  }

  async getReward(miningAddress: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const miningContract = new ethers.Contract(miningAddress, LIQUIDITY_MINING_ABI, this.signer);
    const tx = await miningContract.getReward();
    await tx.wait();
    return tx.hash;
  }

  async exit(miningAddress: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const miningContract = new ethers.Contract(miningAddress, LIQUIDITY_MINING_ABI, this.signer);
    const tx = await miningContract.exit();
    await tx.wait();
    return tx.hash;
  }

  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    if (!this.account) return 0n;

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    return await tokenContract.balanceOf(this.account);
  }

  async getSuppliedBalance(marketAddress: string): Promise<bigint> {
    if (!this.account) return 0n;

    const marketContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.provider);
    return await marketContract.balanceOf(this.account);
  }
}

export default new MiningWeb3Service();
