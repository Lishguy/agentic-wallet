/**
 * Agent Controller Module
 * 
 * Orchestrates agent execution:
 * 1. Load agent wallet
 * 2. Get current balance
 * 3. Ask Agent Brain for decision
 * 4. Execute transaction if required via Transaction Manager
 * 
 * Scalable to multiple agents
 */

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection } from './solanaClient';
import type { AgentWallet } from './walletManager';
import { getWallet } from './walletManager';
import type { AgentDecision } from './agentBrain';
import { AgentBrain } from './agentBrain';
import type { TransferResult } from './transactionManager';
import { sendSOL, requestAirdrop } from './transactionManager';

export interface AgentExecutionResult {
  agentId: string;
  agentName: string;
  timestamp: Date;
  balanceSOL: number;
  decision: AgentDecision;
  execution?: TransferResult;
  error?: string;
  explorerUrl?: string;
}

export interface AgentState {
  wallet: AgentWallet;
  brain: AgentBrain;
  lastExecution?: AgentExecutionResult;
  isRunning: boolean;
  totalTransactions: number;
  totalVolumeSOL: number;
}

// Agent registry - holds all active agents
const agentRegistry: Map<string, AgentState> = new Map();

/**
 * Register a new agent
 */
export function registerAgent(
  wallet: AgentWallet,
  brain: AgentBrain
): AgentState {
  const state: AgentState = {
    wallet,
    brain,
    isRunning: false,
    totalTransactions: 0,
    totalVolumeSOL: 0,
  };

  agentRegistry.set(wallet.id, state);
  console.log(`[AgentController] Registered agent: ${wallet.name} (${wallet.id})`);
  
  return state;
}

/**
 * Get agent state
 */
export function getAgentState(agentId: string): AgentState | undefined {
  return agentRegistry.get(agentId);
}

/**
 * Get all agent states
 */
export function getAllAgentStates(): AgentState[] {
  return Array.from(agentRegistry.values());
}

/**
 * Get agent balance
 */
export async function getAgentBalance(agentId: string): Promise<number> {
  const state = agentRegistry.get(agentId);
  if (!state) {
    throw new Error(`Agent ${agentId} not found`);
  }

  const connection = getConnection();
  const balance = await connection.getBalance(state.wallet.publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Execute agent decision
 */
async function executeDecision(
  state: AgentState,
  decision: AgentDecision
): Promise<TransferResult | undefined> {
  const { wallet } = state;
  const action = decision.action;

  switch (action.type) {
    case 'TRANSFER_SOL': {
      // For demo, transfer to a default treasury or another agent
      let recipient = action.recipient;
      
      // Handle special recipients
      if (recipient === 'treasury') {
        // Use agent-2 as treasury for demo
        const treasury = getWallet('agent-2');
        if (treasury && treasury.id !== wallet.id) {
          recipient = treasury.publicKey.toBase58();
        } else {
          // Self-transfer for demo if no treasury
          recipient = wallet.publicKey.toBase58();
        }
      }

      const result = await sendSOL(
        wallet.keypair,
        recipient,
        action.amount
      );

      if (result.success) {
        state.totalTransactions++;
        state.totalVolumeSOL += action.amount;
      }

      return result;
    }

    case 'REQUEST_AIRDROP': {
      const result = await requestAirdrop(wallet.publicKey, 1);
      return result;
    }

    case 'HOLD':
    case 'WAIT':
    default:
      // No execution needed
      console.log(`[AgentController:${wallet.id}] ${action.type}: ${action.reason}`);
      return undefined;
  }
}

/**
 * Run a single agent cycle
 */
export async function runAgent(agentId: string): Promise<AgentExecutionResult> {
  const state = agentRegistry.get(agentId);
  if (!state) {
    throw new Error(`Agent ${agentId} not found`);
  }

  state.isRunning = true;
  const startTime = Date.now();

  try {
    // 1. Get current balance
    const balanceSOL = await getAgentBalance(agentId);
    console.log(`[AgentController:${agentId}] Balance: ${balanceSOL.toFixed(4)} SOL`);

    // 2. Ask Agent Brain for decision
    const decision = await state.brain.makeDecision(balanceSOL);

    // 3. Execute decision if needed
    const execution = await executeDecision(state, decision);

    // 4. Build result
    const result: AgentExecutionResult = {
      agentId,
      agentName: state.wallet.name,
      timestamp: new Date(),
      balanceSOL,
      decision,
      execution,
      explorerUrl: execution?.signature 
        ? `https://explorer.solana.com/tx/${execution.signature}?cluster=devnet`
        : undefined,
    };

    state.lastExecution = result;
    state.isRunning = false;

    const duration = Date.now() - startTime;
    console.log(`[AgentController:${agentId}] Cycle completed in ${duration}ms`);

    return result;
  } catch (error) {
    state.isRunning = false;
    console.error(`[AgentController:${agentId}] Execution failed:`, error);
    
    return {
      agentId,
      agentName: state.wallet.name,
      timestamp: new Date(),
      balanceSOL: 0,
      decision: {
        action: { type: 'WAIT', reason: 'Execution failed' },
        confidence: 0,
        timestamp: new Date(),
        agentId,
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all registered agents
 */
export async function runAllAgents(): Promise<AgentExecutionResult[]> {
  console.log('[AgentController] Running all agents...');
  
  const results: AgentExecutionResult[] = [];
  
  for (const [agentId] of agentRegistry) {
    try {
      // Add small delay between agents to avoid rate limiting
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const result = await runAgent(agentId);
      results.push(result);
    } catch (error) {
      console.error(`[AgentController] Failed to run agent ${agentId}:`, error);
      const state = agentRegistry.get(agentId);
      results.push({
        agentId,
        agentName: state?.wallet.name || agentId,
        timestamp: new Date(),
        balanceSOL: 0,
        decision: {
          action: { type: 'WAIT', reason: 'Agent run failed' },
          confidence: 0,
          timestamp: new Date(),
          agentId,
        },
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(`[AgentController] All agents completed. Success: ${results.filter(r => !r.error).length}/${results.length}`);
  
  return results;
}

/**
 * Start autonomous agent loop
 */
export function startAutonomousLoop(
  intervalMs: number = 15000,
  onCycle?: (results: AgentExecutionResult[]) => void
): () => void {
  console.log(`[AgentController] Starting autonomous loop (${intervalMs}ms interval)`);
  
  // Run immediately
  runAllAgents().then(onCycle);
  
  // Set up interval
  const intervalId = setInterval(async () => {
    const results = await runAllAgents();
    onCycle?.(results);
  }, intervalMs);

  // Return stop function
  return () => {
    clearInterval(intervalId);
    console.log('[AgentController] Autonomous loop stopped');
  };
}

/**
 * Get agent statistics
 */
export function getAgentStats(agentId: string) {
  const state = agentRegistry.get(agentId);
  if (!state) return null;

  return {
    ...state.brain.getStats(),
    publicKey: state.wallet.publicKey.toBase58(),
    totalTransactions: state.totalTransactions,
    totalVolumeSOL: state.totalVolumeSOL.toFixed(4),
    isRunning: state.isRunning,
  };
}

/**
 * Get all agents statistics
 */
export function getAllAgentsStats() {
  const stats: Record<string, unknown> = {};
  
  for (const [agentId] of agentRegistry) {
    stats[agentId] = getAgentStats(agentId);
  }

  return stats;
}

/**
 * Initialize agents from registry configuration
 */
export async function initializeAgents(
  configs: Array<{
    wallet: AgentWallet;
    strategy?: string;
  }>
): Promise<void> {
  for (const config of configs) {
    const brain = new AgentBrain(
      config.wallet.id,
      config.wallet.name,
      config.strategy || 'moderate'
    );
    
    registerAgent(config.wallet, brain);
  }

  console.log(`[AgentController] Initialized ${configs.length} agents`);
}

export default {
  registerAgent,
  getAgentState,
  getAllAgentStates,
  getAgentBalance,
  runAgent,
  runAllAgents,
  startAutonomousLoop,
  getAgentStats,
  getAllAgentsStats,
  initializeAgents,
};
