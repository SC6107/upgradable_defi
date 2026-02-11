/**
 * Shared Web3 base class — wallet connection, ERC-20 allowance helper, common ABIs.
 * Module-specific web3 services extend this class.
 */
import { ethers } from 'ethers';

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) external returns (bool)',
];

export type TxSubmittedStage = 'approval' | 'transaction';

export interface TxSubmittedInfo {
  hash: string;
  stage: TxSubmittedStage;
  label: string;
}

export type TxSubmittedHandler = (info: TxSubmittedInfo) => void;

export class Web3Base {
  protected provider: ethers.BrowserProvider | null = null;
  protected signer: ethers.JsonRpcSigner | null = null;
  protected account: string | null = null;

  private static getConfiguredRpcUrl(): string {
    const network = (import.meta.env.VITE_NETWORK ?? '').toLowerCase();
    const anvilRpc = import.meta.env.VITE_ANVIL_RPC_URL;
    const sepoliaRpc = import.meta.env.VITE_SEPOLIA_RPC_URL;

    if (network === 'anvil') return anvilRpc || sepoliaRpc || '';
    if (network === 'sepolia') return sepoliaRpc || anvilRpc || '';

    return anvilRpc || sepoliaRpc || '';
  }

  async connect(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask or a compatible wallet');
    }
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    this.account = await this.signer.getAddress();
    return this.account;
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.account = null;
  }

  getAccount(): string | null {
    return this.account;
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  getSigner(): ethers.JsonRpcSigner | null {
    return this.signer;
  }

  protected extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (!error || typeof error !== 'object') {
      return 'Unknown error';
    }

    const err = error as {
      shortMessage?: string;
      message?: string;
      reason?: string;
      error?: unknown;
      data?: unknown;
      info?: unknown;
    };

    const direct =
      (typeof err.shortMessage === 'string' && err.shortMessage) ||
      (typeof err.message === 'string' && err.message) ||
      (typeof err.reason === 'string' && err.reason);
    if (direct) return direct;

    const nested = [err.error, err.data, err.info];
    for (const candidate of nested) {
      const message = this.extractErrorMessage(candidate);
      if (message && message !== 'Unknown error') {
        return message;
      }
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  protected normalizeTxError(error: unknown, fallback: string): Error {
    const raw = this.extractErrorMessage(error).trim();
    const lower = raw.toLowerCase();

    if (lower.includes('user rejected') || lower.includes('action_rejected')) {
      return new Error('Transaction was rejected in wallet.');
    }

    if (lower.includes('insufficient funds')) {
      return new Error('Insufficient ETH for gas on the connected network.');
    }

    // OpenZeppelin ERC20InsufficientBalance(address,uint256,uint256)
    if (lower.includes('e450d38c')) {
      return new Error('Insufficient token balance for this transaction amount.');
    }

    if (
      lower.includes('could not coalesce error') ||
      lower.includes('rpc end point returned http client error') ||
      lower.includes('httpstatus') ||
      lower.includes('code": -32080')
    ) {
      const configuredRpc = Web3Base.getConfiguredRpcUrl();
      return new Error(
        `Wallet RPC rejected the transaction. This usually means wallet RPC/network does not match deployed contracts. Configure wallet RPC to ${configuredRpc || 'the RPC URL in .env_example'} and retry.`
      );
    }

    if (raw.includes('payload=')) {
      return new Error(raw.split('payload=')[0].trim());
    }

    return new Error(raw || fallback);
  }

  protected async assertContractExists(address: string, label: string): Promise<void> {
    if (!this.provider) {
      throw new Error('Wallet provider not connected');
    }
    if (!ethers.isAddress(address)) {
      throw new Error(`${label} address is invalid`);
    }

    const code = await this.provider.getCode(address);
    if (!code || code === '0x') {
      const configuredRpc = Web3Base.getConfiguredRpcUrl();
      throw new Error(
        `${label} contract is not deployed on the connected wallet RPC. Switch to the deployment network (RPC from .env_example: ${configuredRpc || 'not configured'}).`
      );
    }
  }

  protected async assertGasBalance(requiredGasUnits: bigint = 400000n): Promise<void> {
    if (!this.provider || !this.account) {
      throw new Error('Wallet not connected');
    }

    const balance = await this.provider.getBalance(this.account);
    const feeData = await this.provider.getFeeData();
    const fallbackGasPrice = 20_000_000_000n; // 20 gwei
    const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? fallbackGasPrice;
    const requiredWei = gasPrice * requiredGasUnits;

    if (balance < requiredWei) {
      throw new Error(
        `Insufficient ETH for gas. Need about ${ethers.formatEther(requiredWei)} ETH, wallet has ${ethers.formatEther(balance)} ETH on this network.`
      );
    }
  }

  protected async waitForTx(
    tx: ethers.TransactionResponse,
    onSubmitted?: TxSubmittedHandler,
    submitted?: { stage?: TxSubmittedStage; label?: string }
  ): Promise<void> {
    onSubmitted?.({
      hash: tx.hash,
      stage: submitted?.stage ?? 'transaction',
      label: submitted?.label ?? 'Transaction submitted',
    });
    await tx.wait();
  }

  /**
   * Ensure the spender has sufficient allowance for the given amount.
   * If not, sends an approve(MaxUint256) transaction and waits for confirmation.
   */
  async ensureAllowance(
    tokenAddress: string,
    spender: string,
    amount: bigint,
    onSubmitted?: TxSubmittedHandler
  ): Promise<void> {
    if (!this.signer || !this.account) {
      throw new Error('Wallet not connected');
    }
    await this.assertContractExists(tokenAddress, 'Token');
    await this.assertContractExists(spender, 'Spender');

    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
    const allowance: bigint = await token.allowance(this.account, spender);
    if (allowance >= amount) return;

    try {
      const tx = await token.approve(spender, ethers.MaxUint256);
      await this.waitForTx(tx, onSubmitted, {
        stage: 'approval',
        label: 'Approval submitted',
      });
      return;
    } catch (error) {
      const raw = this.extractErrorMessage(error).toLowerCase();
      if (raw.includes('user rejected') || raw.includes('action_rejected')) {
        throw this.normalizeTxError(error, 'Approval rejected');
      }
    }

    try {
      if (allowance > 0n) {
        const resetTx = await token.approve(spender, 0n, { gasLimit: 120000n });
        await this.waitForTx(resetTx, onSubmitted, {
          stage: 'approval',
          label: 'Approval reset submitted',
        });
      }
      const retryTx = await token.approve(spender, amount, { gasLimit: 200000n });
      await this.waitForTx(retryTx, onSubmitted, {
        stage: 'approval',
        label: 'Approval submitted',
      });
    } catch (error) {
      throw this.normalizeTxError(error, 'Token approval failed');
    }
  }
}
