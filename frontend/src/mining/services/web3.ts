/**
 * Mining Web3 Service
 * Extends Web3Base with mining-specific blockchain operations.
 */
import { ethers } from 'ethers';
import { Web3Base, ERC20_ABI, type TxSubmittedHandler } from '@/shared/services/web3Base';
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

export interface SupplyAndStakeResult {
  supplyTxHash: string;
  stakeTxHash: string;
  stakedAmount: string;
}

class MiningWeb3Service extends Web3Base {
  private async getTokenDecimals(tokenAddress: string): Promise<number> {
    await this.assertContractExists(tokenAddress, 'Token');

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    const decimals = await tokenContract.decimals();
    return Number(decimals);
  }

  private async parseTokenAmount(
    tokenAddress: string,
    amount: string,
    label: string
  ): Promise<{ amountBN: bigint; decimals: number }> {
    const value = amount.trim();
    if (!value) {
      throw new Error(`${label} amount is required`);
    }

    const decimals = await this.getTokenDecimals(tokenAddress);
    let amountBN: bigint;
    try {
      amountBN = ethers.parseUnits(value, decimals);
    } catch {
      throw new Error(`Invalid ${label} amount`);
    }

    if (amountBN <= 0n) {
      throw new Error(`${label} amount must be greater than 0`);
    }

    return { amountBN, decimals };
  }

  async supply(
    marketAddress: string,
    amount: string,
    underlyingAddress: string,
    onSubmitted?: TxSubmittedHandler
  ): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const { amountBN, decimals } = await this.parseTokenAmount(underlyingAddress, amount, 'Supply');
    const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
    const marketContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);

    const balance = await underlyingContract.balanceOf(this.account);
    if (balance < amountBN) {
      throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, decimals)} tokens`);
    }

    await this.ensureAllowance(underlyingAddress, marketAddress, amountBN, onSubmitted);

    const tx = await marketContract.mint(amountBN);
    await this.waitForTx(tx, onSubmitted, {
      stage: 'transaction',
      label: 'Supply submitted',
    });

    return tx.hash;
  }

  async supplyAndStake(
    miningAddress: string,
    marketAddress: string,
    underlyingAddress: string,
    amount: string,
    onSubmitted?: TxSubmittedHandler
  ): Promise<SupplyAndStakeResult> {
    if (!this.signer || !this.account || !this.provider) throw new Error('Wallet not connected');

    await this.assertContractExists(miningAddress, 'Liquidity mining');
    await this.assertContractExists(marketAddress, 'Market');
    await this.assertContractExists(underlyingAddress, 'Underlying token');

    const miningContract = new ethers.Contract(miningAddress, LIQUIDITY_MINING_ABI, this.signer);
    const stakingToken: string = await miningContract.stakingToken();
    if (stakingToken.toLowerCase() !== marketAddress.toLowerCase()) {
      throw new Error('Selected market does not match this mining pool staking token');
    }

    const { amountBN, decimals: underlyingDecimals } = await this.parseTokenAmount(
      underlyingAddress,
      amount,
      'Supply'
    );
    const stakingDecimals = await this.getTokenDecimals(stakingToken);

    const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
    const marketContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);
    const stakingContract = new ethers.Contract(stakingToken, ERC20_ABI, this.provider);

    const underlyingBalance = await underlyingContract.balanceOf(this.account);
    if (underlyingBalance < amountBN) {
      throw new Error(
        `Insufficient balance. You have ${ethers.formatUnits(underlyingBalance, underlyingDecimals)} tokens`
      );
    }

    const stakingBalanceBefore: bigint = await stakingContract.balanceOf(this.account);

    await this.ensureAllowance(underlyingAddress, marketAddress, amountBN, onSubmitted);

    const supplyTx = await marketContract.mint(amountBN);
    await this.waitForTx(supplyTx, onSubmitted, {
      stage: 'transaction',
      label: 'Supply submitted',
    });

    const stakingBalanceAfter: bigint = await stakingContract.balanceOf(this.account);
    const minted = stakingBalanceAfter - stakingBalanceBefore;
    if (minted <= 0n) {
      throw new Error('Supply succeeded but no staking tokens were minted');
    }

    await this.ensureAllowance(stakingToken, miningAddress, minted, onSubmitted);

    const stakeTx = await miningContract.stake(minted);
    await this.waitForTx(stakeTx, onSubmitted, {
      stage: 'transaction',
      label: 'Stake submitted',
    });

    return {
      supplyTxHash: supplyTx.hash,
      stakeTxHash: stakeTx.hash,
      stakedAmount: ethers.formatUnits(minted, stakingDecimals),
    };
  }

  async redeem(marketAddress: string, amount: string, onSubmitted?: TxSubmittedHandler): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const amountBN = ethers.parseUnits(amount, 18);
    const marketContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);

    const tx = await marketContract.redeem(amountBN);
    await this.waitForTx(tx, onSubmitted, {
      stage: 'transaction',
      label: 'Redeem submitted',
    });

    return tx.hash;
  }

  async borrow(marketAddress: string, amount: string, onSubmitted?: TxSubmittedHandler): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const amountBN = ethers.parseUnits(amount, 18);
    const marketContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);

    const tx = await marketContract.borrow(amountBN);
    await this.waitForTx(tx, onSubmitted, {
      stage: 'transaction',
      label: 'Borrow submitted',
    });

    return tx.hash;
  }

  async repay(
    marketAddress: string,
    amount: string,
    underlyingAddress: string,
    onSubmitted?: TxSubmittedHandler
  ): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const amountBN = ethers.parseUnits(amount, 18);
    const marketContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);

    await this.ensureAllowance(underlyingAddress, marketAddress, amountBN, onSubmitted);

    const tx = await marketContract.repayBorrow(amountBN);
    await this.waitForTx(tx, onSubmitted, {
      stage: 'transaction',
      label: 'Repay submitted',
    });

    return tx.hash;
  }

  async enterMarkets(markets: string[], onSubmitted?: TxSubmittedHandler): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const contracts = await API.getContractAddresses();
    const comptrollerAddress = contracts.comptroller;
    if (!comptrollerAddress || !ethers.isAddress(comptrollerAddress)) {
      throw new Error('Comptroller address is unavailable from backend API');
    }

    const comptrollerContract = new ethers.Contract(comptrollerAddress, COMPTROLLER_ABI, this.signer);

    const tx = await comptrollerContract.enterMarkets(markets);
    await this.waitForTx(tx, onSubmitted, {
      stage: 'transaction',
      label: 'Enter markets submitted',
    });

    return tx.hash;
  }

  async stake(miningAddress: string, amount: string, onSubmitted?: TxSubmittedHandler): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const miningContract = new ethers.Contract(miningAddress, LIQUIDITY_MINING_ABI, this.signer);
    const stakingToken: string = await miningContract.stakingToken();
    const { amountBN } = await this.parseTokenAmount(stakingToken, amount, 'Stake');

    await this.ensureAllowance(stakingToken, miningAddress, amountBN, onSubmitted);

    const tx = await miningContract.stake(amountBN);
    await this.waitForTx(tx, onSubmitted, {
      stage: 'transaction',
      label: 'Stake submitted',
    });

    return tx.hash;
  }

  async withdraw(miningAddress: string, amount: string, onSubmitted?: TxSubmittedHandler): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const miningContract = new ethers.Contract(miningAddress, LIQUIDITY_MINING_ABI, this.signer);
    const stakingToken: string = await miningContract.stakingToken();
    const { amountBN } = await this.parseTokenAmount(stakingToken, amount, 'Withdraw');

    const tx = await miningContract.withdraw(amountBN);
    await this.waitForTx(tx, onSubmitted, {
      stage: 'transaction',
      label: 'Withdraw submitted',
    });

    return tx.hash;
  }

  async getReward(miningAddress: string, onSubmitted?: TxSubmittedHandler): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const miningContract = new ethers.Contract(miningAddress, LIQUIDITY_MINING_ABI, this.signer);
    const tx = await miningContract.getReward();
    await this.waitForTx(tx, onSubmitted, {
      stage: 'transaction',
      label: 'Claim submitted',
    });
    return tx.hash;
  }

  async exit(miningAddress: string, onSubmitted?: TxSubmittedHandler): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');

    const miningContract = new ethers.Contract(miningAddress, LIQUIDITY_MINING_ABI, this.signer);
    const tx = await miningContract.exit();
    await this.waitForTx(tx, onSubmitted, {
      stage: 'transaction',
      label: 'Exit submitted',
    });
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
