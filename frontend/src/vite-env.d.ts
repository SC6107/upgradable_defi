/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_NETWORK?: string;
  readonly VITE_ANVIL_RPC_URL?: string;
  readonly VITE_SEPOLIA_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface EthereumRequestArgs {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

type EthereumEventCallback = (...args: unknown[]) => void;

interface EthereumProvider {
  request: (args: EthereumRequestArgs) => Promise<unknown>;
  on?: (event: string, callback: EthereumEventCallback) => void;
  removeListener?: (event: string, callback: EthereumEventCallback) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
