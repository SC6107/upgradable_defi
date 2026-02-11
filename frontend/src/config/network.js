const rawNetwork = (import.meta.env.VITE_NETWORK ?? 'sepolia').trim().toLowerCase();
if (rawNetwork !== 'anvil' && rawNetwork !== 'sepolia') {
    throw new Error("Invalid VITE_NETWORK. Expected 'anvil' or 'sepolia'.");
}
const anvilRpcUrl = import.meta.env.VITE_ANVIL_RPC_URL || 'http://127.0.0.1:8545';
const sepoliaRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const NETWORKS = {
    anvil: {
        key: 'anvil',
        label: 'Anvil',
        chainId: 31337,
        chainHex: '0x7a69',
        chainName: 'Anvil Local',
        rpcUrl: anvilRpcUrl,
    },
    sepolia: {
        key: 'sepolia',
        label: 'Sepolia',
        chainId: 11155111,
        chainHex: '0xaa36a7',
        chainName: 'Sepolia',
        rpcUrl: sepoliaRpcUrl,
        explorerUrl: 'https://sepolia.etherscan.io',
    },
};
export const TARGET_NETWORK = NETWORKS[rawNetwork];
export const TARGET_NETWORK_LABEL = TARGET_NETWORK.label;
export const TARGET_CHAIN_ID = TARGET_NETWORK.chainId;
export function isExpectedChainId(chainId) {
    return chainId === TARGET_CHAIN_ID;
}
export async function switchWalletToTargetNetwork() {
    if (!window.ethereum) {
        throw new Error('MetaMask or compatible wallet not found');
    }
    const currentHex = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(String(currentHex), 16);
    if (currentChainId === TARGET_CHAIN_ID) {
        return currentChainId;
    }
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: TARGET_NETWORK.chainHex }],
        });
    }
    catch (error) {
        const err = error;
        if (err.code !== 4902) {
            throw new Error(err.message || `Failed to switch to ${TARGET_NETWORK_LABEL}`);
        }
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
                {
                    chainId: TARGET_NETWORK.chainHex,
                    chainName: TARGET_NETWORK.chainName,
                    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                    rpcUrls: [TARGET_NETWORK.rpcUrl],
                    ...(TARGET_NETWORK.explorerUrl ? { blockExplorerUrls: [TARGET_NETWORK.explorerUrl] } : {}),
                },
            ],
        });
    }
    const nextHex = await window.ethereum.request({ method: 'eth_chainId' });
    const nextChainId = parseInt(String(nextHex), 16);
    if (nextChainId !== TARGET_CHAIN_ID) {
        throw new Error(`Wallet network mismatch. Expected chain ${TARGET_CHAIN_ID}, got ${nextChainId}`);
    }
    return nextChainId;
}
