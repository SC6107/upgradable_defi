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
    try {
      if (!this.signer || !this.account) throw new Error('Wallet not connected');
      // approve + mint (+ optional enterMarkets) may require multiple txs
      await this.assertGasBalance(900000n);
      await this.assertContractExists(underlyingAddress, 'Underlying token');
      await this.assertContractExists(marketAddress, 'Lending market');

      const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
      const decimals = await underlyingContract.decimals();
      const symbol = await underlyingContract.symbol().catch(() => 'token');
      const amountWei = ethers.parseUnits(amount, decimals);
      const walletBalance: bigint = await underlyingContract.balanceOf(this.account);

      if (walletBalance < amountWei) {
        throw new Error(
          `Insufficient ${symbol} balance. Need ${ethers.formatUnits(amountWei, decimals)} ${symbol}, wallet has ${ethers.formatUnits(walletBalance, decimals)} ${symbol}.`
        );
      }

      await this.ensureAllowance(underlyingAddress, marketAddress, amountWei);

      const lendingContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);
      const mintTx = await lendingContract.mint(amountWei);
      const receipt = await mintTx.wait();

      if (comptrollerAddress) {
        await this.enterMarkets(comptrollerAddress, [marketAddress]);
      }

      return receipt.hash;
    } catch (error) {
      throw this.normalizeTxError(error, 'Supply transaction failed');
    }
  }

  async withdraw(marketAddress: string, amount: string, isUnderlying: boolean = true): Promise<string> {
    try {
      if (!this.signer) throw new Error('Wallet not connected');
      await this.assertGasBalance(350000n);
      await this.assertContractExists(marketAddress, 'Lending market');

      const lendingContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);

      let tx;
      if (isUnderlying) {
        const underlyingAddress = await lendingContract.underlying();
        await this.assertContractExists(underlyingAddress, 'Underlying token');
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
    } catch (error) {
      throw this.normalizeTxError(error, 'Withdraw transaction failed');
    }
  }

  async borrow(marketAddress: string, amount: string): Promise<string> {
    try {
      if (!this.signer) throw new Error('Wallet not connected');
      await this.assertGasBalance(350000n);
      await this.assertContractExists(marketAddress, 'Lending market');

      const lendingContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);
      const underlyingAddress = await lendingContract.underlying();
      await this.assertContractExists(underlyingAddress, 'Underlying token');
      const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
      const decimals = await underlyingContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);

      const borrowTx = await lendingContract.borrow(amountWei);
      const receipt = await borrowTx.wait();

      return receipt.hash;
    } catch (error) {
      throw this.normalizeTxError(error, 'Borrow transaction failed');
    }
  }

  async repay(marketAddress: string, amount: string, underlyingAddress: string): Promise<string> {
    try {
      if (!this.signer) throw new Error('Wallet not connected');
      await this.assertGasBalance(700000n);
      await this.assertContractExists(underlyingAddress, 'Underlying token');
      await this.assertContractExists(marketAddress, 'Lending market');

      const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
      const decimals = await underlyingContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);

      await this.ensureAllowance(underlyingAddress, marketAddress, amountWei);

      const lendingContract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);
      const repayTx = await lendingContract.repayBorrow(amountWei);
      const receipt = await repayTx.wait();

      return receipt.hash;
    } catch (error) {
      throw this.normalizeTxError(error, 'Repay transaction failed');
    }
  }

  async enterMarkets(comptrollerAddress: string, marketAddresses: string[]): Promise<string> {
    try {
      if (!this.signer) throw new Error('Wallet not connected');
      await this.assertGasBalance(300000n);
      await this.assertContractExists(comptrollerAddress, 'Comptroller');

      const comptroller = new ethers.Contract(comptrollerAddress, COMPTROLLER_ABI, this.signer);
      const tx = await comptroller.enterMarkets(marketAddresses);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      throw this.normalizeTxError(error, 'Enter market transaction failed');
    }
  }

  async exitMarket(comptrollerAddress: string, marketAddress: string): Promise<string> {
    try {
      if (!this.signer) throw new Error('Wallet not connected');
      await this.assertGasBalance(300000n);
      await this.assertContractExists(comptrollerAddress, 'Comptroller');
      await this.assertContractExists(marketAddress, 'Lending market');

      const comptroller = new ethers.Contract(comptrollerAddress, COMPTROLLER_ABI, this.signer);
      const tx = await comptroller.exitMarket(marketAddress);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      throw this.normalizeTxError(error, 'Exit market transaction failed');
    }
  }

  async getUnderlyingBalance(underlyingAddress: string): Promise<string> {
    try {
      if (!this.signer || !this.account) throw new Error('Wallet not connected');
      await this.assertContractExists(underlyingAddress, 'Underlying token');

      const contract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
      const balance = await contract.balanceOf(this.account);
      const decimals = await contract.decimals();

      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      throw this.normalizeTxError(error, 'Failed to load underlying balance');
    }
  }

  async getLendingTokenBalance(marketAddress: string): Promise<string> {
    try {
      if (!this.signer || !this.account) throw new Error('Wallet not connected');
      await this.assertContractExists(marketAddress, 'Lending market');

      const contract = new ethers.Contract(marketAddress, LENDING_TOKEN_ABI, this.signer);
      const balance = await contract.balanceOf(this.account);
      const decimals = await contract.decimals();

      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      throw this.normalizeTxError(error, 'Failed to load market balance');
    }
  }

  async liquidateBorrow(
    repayCTokenAddress: string,
    borrower: string,
    repayAmount: string,
    collateralCTokenAddress: string,
    underlyingAddress: string
  ): Promise<string> {
    try {
      if (!this.signer || !this.account) throw new Error('Wallet not connected');
      await this.assertGasBalance(700000n);
      await this.assertContractExists(underlyingAddress, 'Underlying token');
      await this.assertContractExists(repayCTokenAddress, 'Repay market');
      await this.assertContractExists(collateralCTokenAddress, 'Collateral market');

      const underlyingContract = new ethers.Contract(underlyingAddress, ERC20_ABI, this.signer);
      const decimals = await underlyingContract.decimals();
      const amountWei = ethers.parseUnits(repayAmount, decimals);

      await this.ensureAllowance(underlyingAddress, repayCTokenAddress, amountWei);

      const repayContract = new ethers.Contract(repayCTokenAddress, LENDING_TOKEN_ABI, this.signer);
      const tx = await repayContract.liquidateBorrow(borrower, amountWei, collateralCTokenAddress);
      const receipt = await tx.wait();

      return receipt!.hash;
    } catch (error) {
      throw this.normalizeTxError(error, 'Liquidation transaction failed');
    }
  }
}

export default new LendingWeb3Service();
