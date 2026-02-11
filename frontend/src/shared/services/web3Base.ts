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

export class Web3Base {
  protected provider: ethers.BrowserProvider | null = null;
  protected signer: ethers.JsonRpcSigner | null = null;
  protected account: string | null = null;

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

  /**
   * Ensure the spender has sufficient allowance for the given amount.
   * If not, sends an approve(MaxUint256) transaction and waits for confirmation.
   */
  async ensureAllowance(
    tokenAddress: string,
    spender: string,
    amount: bigint
  ): Promise<void> {
    if (!this.signer || !this.account) {
      throw new Error('Wallet not connected');
    }
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
    const allowance: bigint = await token.allowance(this.account, spender);
    if (allowance < amount) {
      const tx = await token.approve(spender, ethers.MaxUint256);
      await tx.wait();
    }
  }
}
