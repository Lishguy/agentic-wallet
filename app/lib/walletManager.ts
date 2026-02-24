/**
 * Wallet Manager Module
 * 
 * Handles programmatic wallet creation and management
 * Follows Solana Docs - Operators for proper keypair creation & signing practices
 * 
 * Reference: https://launch.solana.com/docs/kora/operators
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export interface AgentWallet {
  id: string;
  name: string;
  keypair: Keypair;
  publicKey: PublicKey;
  createdAt: Date;
}

export interface WalletInfo {
  id: string;
  name: string;
  publicKey: string;
  createdAt: string;
}

// In-memory wallet storage (for demo purposes)
const walletStore: Map<string, AgentWallet> = new Map();

/**
 * Create a new agent wallet programmatically
 * Generates a new keypair for autonomous agent use
 */
export function createWallet(id: string, name: string): AgentWallet {
  const keypair = Keypair.generate();
  
  const wallet: AgentWallet = {
    id,
    name,
    keypair,
    publicKey: keypair.publicKey,
    createdAt: new Date(),
  };

  walletStore.set(id, wallet);
  
  console.log(`[WalletManager] Created wallet: ${name} (${id})`);
  console.log(`[WalletManager] Public Key: ${keypair.publicKey.toBase58()}`);
  
  return wallet;
}

/**
 * Load wallet from private key (base58 encoded)
 * Used for loading existing agent wallets from secure storage
 */
export function loadWalletFromPrivateKey(
  id: string, 
  name: string, 
  privateKeyBase58: string
): AgentWallet {
  try {
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);

    const wallet: AgentWallet = {
      id,
      name,
      keypair,
      publicKey: keypair.publicKey,
      createdAt: new Date(),
    };

    walletStore.set(id, wallet);
    
    console.log(`[WalletManager] Loaded wallet: ${name} (${id})`);
    console.log(`[WalletManager] Public Key: ${keypair.publicKey.toBase58()}`);
    
    return wallet;
  } catch (error) {
    throw new Error(`[WalletManager] Failed to load wallet ${id}: ${error}`);
  }
}

/**
 * Load wallet from environment variable
 * Secure way to load agent wallets in production
 */
export function loadWalletFromEnv(envVarName: string, id: string, name: string): AgentWallet {
  const privateKey = import.meta.env[envVarName];
  
  if (!privateKey) {
    throw new Error(`[WalletManager] Environment variable ${envVarName} not found`);
  }

  return loadWalletFromPrivateKey(id, name, privateKey);
}

/**
 * Get wallet by ID
 */
export function getWallet(id: string): AgentWallet | undefined {
  return walletStore.get(id);
}

/**
 * Get all wallets
 */
export function getAllWallets(): AgentWallet[] {
  return Array.from(walletStore.values());
}

/**
 * Get wallet info (safe - no private key)
 */
export function getWalletInfo(wallet: AgentWallet): WalletInfo {
  return {
    id: wallet.id,
    name: wallet.name,
    publicKey: wallet.publicKey.toBase58(),
    createdAt: wallet.createdAt.toISOString(),
  };
}

/**
 * Get all wallet info (safe - no private keys)
 */
export function getAllWalletInfo(): WalletInfo[] {
  return getAllWallets().map(getWalletInfo);
}

/**
 * Remove wallet
 */
export function removeWallet(id: string): boolean {
  const deleted = walletStore.delete(id);
  if (deleted) {
    console.log(`[WalletManager] Removed wallet: ${id}`);
  }
  return deleted;
}

/**
 * Export private key (for backup - use with caution)
 */
export function exportPrivateKey(wallet: AgentWallet): string {
  return bs58.encode(wallet.keypair.secretKey);
}

/**
 * Validate public key string
 */
export function isValidPublicKey(publicKeyString: string): boolean {
  try {
    new PublicKey(publicKeyString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize default agents from environment
 * Creates or loads the multi-agent setup
 */
export function initializeDefaultAgents(): AgentWallet[] {
  const wallets: AgentWallet[] = [];
  
  // Try to load from environment variables first
  const agentConfigs = [
    { envVar: 'VITE_AGENT_1_PRIVATE_KEY', id: 'agent-1', name: 'Alpha Trader' },
    { envVar: 'VITE_AGENT_2_PRIVATE_KEY', id: 'agent-2', name: 'Beta Analyzer' },
    { envVar: 'VITE_AGENT_3_PRIVATE_KEY', id: 'agent-3', name: 'Gamma Monitor' },
  ];

  for (const config of agentConfigs) {
    try {
      if (import.meta.env[config.envVar]) {
        const wallet = loadWalletFromEnv(config.envVar, config.id, config.name);
        wallets.push(wallet);
      } else {
        // Create new wallet if env var not set
        console.log(`[WalletManager] Creating new wallet for ${config.id}`);
        const wallet = createWallet(config.id, config.name);
        wallets.push(wallet);
        
        // Log the private key for user to save
        console.log(`[WalletManager] SAVE THIS PRIVATE KEY for ${config.id}:`);
        console.log(exportPrivateKey(wallet));
      }
    } catch (error) {
      console.warn(`[WalletManager] Could not load ${config.id}:`, error);
    }
  }

  return wallets;
}

export default {
  createWallet,
  loadWalletFromPrivateKey,
  loadWalletFromEnv,
  getWallet,
  getAllWallets,
  getWalletInfo,
  getAllWalletInfo,
  removeWallet,
  exportPrivateKey,
  isValidPublicKey,
  initializeDefaultAgents,
};
