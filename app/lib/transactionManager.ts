/**
 * Transaction Manager Module
 * 
 * Handles transaction creation, signing, and submission
 * Uses Solana JSON RPC API for submitting transactions and monitoring confirmations
 * 
 * Reference: https://solana.com/docs/rpc
 */

import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import type { TransactionSignature } from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { getConnection } from './solanaClient';

export interface TransferResult {
  signature: TransactionSignature;
  success: boolean;
  error?: string;
  confirmation?: string;
}

export interface TransactionStatus {
  signature: TransactionSignature;
  status: 'confirmed' | 'pending' | 'failed' | 'unknown';
  slot?: number;
  err?: unknown;
}

/**
 * Send SOL transfer transaction
 * Autonomous transaction signing by agent wallet
 */
export async function sendSOL(
  fromKeypair: Keypair,
  toPublicKey: PublicKey | string,
  amountSOL: number
): Promise<TransferResult> {
  const connection = getConnection();
  
  try {
    const recipient = typeof toPublicKey === 'string' 
      ? new PublicKey(toPublicKey) 
      : toPublicKey;

    const amountLamports = amountSOL * LAMPORTS_PER_SOL;

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: recipient,
      lamports: amountLamports,
    });

    // Create transaction
    const transaction = new Transaction().add(transferInstruction);

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;

    // Sign transaction
    transaction.sign(fromKeypair);

    // Send transaction
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      }
    );

    console.log(`[TransactionManager] SOL transfer sent: ${signature}`);
    console.log(`[TransactionManager] From: ${fromKeypair.publicKey.toBase58()}`);
    console.log(`[TransactionManager] To: ${recipient.toBase58()}`);
    console.log(`[TransactionManager] Amount: ${amountSOL} SOL`);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    return {
      signature,
      success: true,
      confirmation: 'confirmed',
    };
  } catch (error) {
    console.error('[TransactionManager] SOL transfer failed:', error);
    return {
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Send SPL token transfer transaction
 * Supports USDC, USDT, and other SPL tokens
 */
export async function sendSPLToken(
  fromKeypair: Keypair,
  toPublicKey: PublicKey | string,
  mintAddress: PublicKey | string,
  amount: number,
  decimals: number = 6
): Promise<TransferResult> {
  const connection = getConnection();
  
  try {
    const recipient = typeof toPublicKey === 'string' 
      ? new PublicKey(toPublicKey) 
      : toPublicKey;
    
    const mint = typeof mintAddress === 'string'
      ? new PublicKey(mintAddress)
      : mintAddress;

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      mint,
      fromKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mint,
      recipient,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const transaction = new Transaction();

    // Check if recipient token account exists
    const toAccountInfo = await connection.getAccountInfo(toTokenAccount);
    if (!toAccountInfo) {
      // Create associated token account for recipient
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromKeypair.publicKey,
          toTokenAccount,
          recipient,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Add transfer instruction
    const transferAmount = BigInt(amount * Math.pow(10, decimals));
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromKeypair.publicKey,
        transferAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Get latest blockhash and send
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;

    transaction.sign(fromKeypair);

    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      }
    );

    console.log(`[TransactionManager] SPL token transfer sent: ${signature}`);
    console.log(`[TransactionManager] Mint: ${mint.toBase58()}`);
    console.log(`[TransactionManager] Amount: ${amount}`);

    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    return {
      signature,
      success: true,
      confirmation: 'confirmed',
    };
  } catch (error) {
    console.error('[TransactionManager] SPL token transfer failed:', error);
    return {
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  signature: TransactionSignature
): Promise<TransactionStatus> {
  const connection = getConnection();
  
  try {
    const status = await connection.getSignatureStatus(signature);
    
    if (!status || !status.value) {
      return { signature, status: 'unknown' };
    }

    const { confirmationStatus, err, slot } = status.value;
    
    return {
      signature,
      status: err ? 'failed' : confirmationStatus === 'confirmed' ? 'confirmed' : 'pending',
      slot: slot || undefined,
      err,
    };
  } catch (error) {
    console.error('[TransactionManager] Failed to get transaction status:', error);
    return { signature, status: 'unknown' };
  }
}

/**
 * Request airdrop (Devnet only)
 */
export async function requestAirdrop(
  publicKey: PublicKey,
  amountSOL: number = 1
): Promise<TransferResult> {
  const connection = getConnection();
  
  try {
    const signature = await connection.requestAirdrop(
      publicKey,
      amountSOL * LAMPORTS_PER_SOL
    );

    console.log(`[TransactionManager] Airdrop requested: ${signature}`);

    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Airdrop failed: ${confirmation.value.err}`);
    }

    return {
      signature,
      success: true,
      confirmation: 'confirmed',
    };
  } catch (error) {
    console.error('[TransactionManager] Airdrop failed:', error);
    return {
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get transaction details
 */
export async function getTransactionDetails(signature: TransactionSignature) {
  const connection = getConnection();
  
  try {
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });
    
    return transaction;
  } catch (error) {
    console.error('[TransactionManager] Failed to get transaction details:', error);
    return null;
  }
}

export default {
  sendSOL,
  sendSPLToken,
  getTransactionStatus,
  requestAirdrop,
  getTransactionDetails,
};
