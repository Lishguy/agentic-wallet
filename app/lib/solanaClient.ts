/**
 * Solana Client Module
 * 
 * Establishes connection to Solana Devnet using JSON RPC API
 * Provides a reusable connection object to backend modules
 * 
 * Reference: https://solana.com/docs/rpc
 */

import { Connection, clusterApiUrl } from '@solana/web3.js';
import type { Commitment } from '@solana/web3.js';

// Connection configuration
const DEVNET_URL = clusterApiUrl('devnet');
const COMMITMENT: Commitment = 'confirmed';

// Connection singleton
let connection: Connection | null = null;

/**
 * Get or create Solana Devnet connection
 * Uses JSON RPC API for all blockchain interactions
 */
export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(DEVNET_URL, {
      commitment: COMMITMENT,
      confirmTransactionInitialTimeout: 60000,
    });
    console.log('[SolanaClient] Connected to Solana Devnet');
  }
  return connection;
}

/**
 * Get connection with custom commitment level
 */
export function getConnectionWithCommitment(commitment: Commitment): Connection {
  return new Connection(DEVNET_URL, {
    commitment,
    confirmTransactionInitialTimeout: 60000,
  });
}

/**
 * Check if connection is healthy
 */
export async function isConnectionHealthy(): Promise<boolean> {
  try {
    const conn = getConnection();
    const version = await conn.getVersion();
    return !!version;
  } catch (error) {
    console.error('[SolanaClient] Connection health check failed:', error);
    return false;
  }
}

/**
 * Get network information
 */
export async function getNetworkInfo() {
  const conn = getConnection();
  const [version, slot, blockTime] = await Promise.all([
    conn.getVersion(),
    conn.getSlot(),
    conn.getBlockTime(await conn.getSlot()),
  ]);

  return {
    version: version['solana-core'],
    slot,
    blockTime,
    network: 'devnet',
    rpcUrl: DEVNET_URL,
  };
}

/**
 * Reset connection (useful for reconnection scenarios)
 */
export function resetConnection(): void {
  connection = null;
  console.log('[SolanaClient] Connection reset');
}

export { DEVNET_URL, COMMITMENT };
