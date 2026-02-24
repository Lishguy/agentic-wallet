/**
 * Agent Registry Module
 * 
 * Holds multiple agent secrets and configurations
 * Enables scalable simulation of multiple independent agent wallets
 * 
 * This module manages the multi-agent setup and their respective
 * private keys, strategies, and operational parameters.
 */

import type { AgentWallet } from '../lib/walletManager';
import { createWallet, loadWalletFromPrivateKey } from '../lib/walletManager';
import type { AgentStrategy } from '../lib/agentBrain';
import { DEFAULT_STRATEGIES } from '../lib/agentBrain';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  strategy: AgentStrategy | string;
  privateKeyEnvVar?: string;
  privateKey?: string;
  autoStart: boolean;
  intervalMs: number;
}

export interface RegisteredAgent {
  config: AgentConfig;
  wallet?: AgentWallet;
  isActive: boolean;
  createdAt: Date;
}

// Default agent configurations
export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'agent-1',
    name: 'Alpha Trader',
    description: 'Conservative trading agent focused on capital preservation',
    strategy: 'conservative',
    privateKeyEnvVar: 'VITE_AGENT_1_PRIVATE_KEY',
    autoStart: true,
    intervalMs: 20000,
  },
  {
    id: 'agent-2',
    name: 'Beta Analyzer',
    description: 'Market analysis agent with moderate risk tolerance',
    strategy: 'moderate',
    privateKeyEnvVar: 'VITE_AGENT_2_PRIVATE_KEY',
    autoStart: true,
    intervalMs: 25000,
  },
  {
    id: 'agent-3',
    name: 'Gamma Monitor',
    description: 'High-frequency monitoring agent with aggressive strategy',
    strategy: 'aggressive',
    privateKeyEnvVar: 'VITE_AGENT_3_PRIVATE_KEY',
    autoStart: false,
    intervalMs: 15000,
  },
];

// Registry storage
const registry: Map<string, RegisteredAgent> = new Map();

/**
 * Initialize the agent registry with default configurations
 */
export function initializeRegistry(customConfigs?: AgentConfig[]): void {
  const configs = customConfigs || DEFAULT_AGENTS;
  
  for (const config of configs) {
    registerAgentConfig(config);
  }

  console.log(`[AgentRegistry] Initialized with ${configs.length} agent configurations`);
}

/**
 * Register an agent configuration
 */
export function registerAgentConfig(config: AgentConfig): RegisteredAgent {
  const registeredAgent: RegisteredAgent = {
    config,
    isActive: false,
    createdAt: new Date(),
  };

  registry.set(config.id, registeredAgent);
  console.log(`[AgentRegistry] Registered agent config: ${config.name} (${config.id})`);
  
  return registeredAgent;
}

/**
 * Load wallet for an agent
 */
export function loadAgentWallet(agentId: string): AgentWallet | null {
  const agent = registry.get(agentId);
  if (!agent) {
    console.error(`[AgentRegistry] Agent ${agentId} not found in registry`);
    return null;
  }

  try {
    let wallet: AgentWallet;

    // Try to load from private key if provided
    if (agent.config.privateKey) {
      wallet = loadWalletFromPrivateKey(
        agent.config.id,
        agent.config.name,
        agent.config.privateKey
      );
    } else {
      // Create new wallet
      wallet = createWallet(agent.config.id, agent.config.name);
      
      // Log the private key for the user to save
      console.log(`[AgentRegistry] Created new wallet for ${agentId}`);
      console.log(`[AgentRegistry] IMPORTANT - Save this private key:`);
      // Note: In production, you'd use a secure method to export
    }

    agent.wallet = wallet;
    agent.isActive = true;
    
    console.log(`[AgentRegistry] Wallet loaded for ${agentId}: ${wallet.publicKey.toBase58()}`);
    
    return wallet;
  } catch (error) {
    console.error(`[AgentRegistry] Failed to load wallet for ${agentId}:`, error);
    return null;
  }
}

/**
 * Load all agent wallets
 */
export function loadAllAgentWallets(): AgentWallet[] {
  const wallets: AgentWallet[] = [];
  
  for (const [agentId] of registry) {
    const wallet = loadAgentWallet(agentId);
    if (wallet) {
      wallets.push(wallet);
    }
  }

  console.log(`[AgentRegistry] Loaded ${wallets.length} agent wallets`);
  return wallets;
}

/**
 * Get registered agent
 */
export function getRegisteredAgent(agentId: string): RegisteredAgent | undefined {
  return registry.get(agentId);
}

/**
 * Get all registered agents
 */
export function getAllRegisteredAgents(): RegisteredAgent[] {
  return Array.from(registry.values());
}

/**
 * Get active agents (with loaded wallets)
 */
export function getActiveAgents(): RegisteredAgent[] {
  return getAllRegisteredAgents().filter(agent => agent.isActive && agent.wallet);
}

/**
 * Update agent configuration
 */
export function updateAgentConfig(
  agentId: string, 
  updates: Partial<AgentConfig>
): RegisteredAgent | null {
  const agent = registry.get(agentId);
  if (!agent) return null;

  agent.config = { ...agent.config, ...updates };
  console.log(`[AgentRegistry] Updated config for ${agentId}`);
  
  return agent;
}

/**
 * Remove agent from registry
 */
export function removeAgent(agentId: string): boolean {
  const deleted = registry.delete(agentId);
  if (deleted) {
    console.log(`[AgentRegistry] Removed agent: ${agentId}`);
  }
  return deleted;
}

/**
 * Get agent strategy
 */
export function getAgentStrategy(agentId: string): AgentStrategy | null {
  const agent = registry.get(agentId);
  if (!agent) return null;

  const strategy = agent.config.strategy;
  if (typeof strategy === 'string') {
    return DEFAULT_STRATEGIES[strategy] || DEFAULT_STRATEGIES.moderate;
  }
  
  return strategy;
}

/**
 * Set agent strategy
 */
export function setAgentStrategy(
  agentId: string, 
  strategy: AgentStrategy | string
): boolean {
  const agent = registry.get(agentId);
  if (!agent) return false;

  agent.config.strategy = strategy;
  console.log(`[AgentRegistry] Strategy updated for ${agentId}`);
  
  return true;
}

/**
 * Get registry statistics
 */
export function getRegistryStats() {
  const allAgents = getAllRegisteredAgents();
  const activeAgents = getActiveAgents();
  
  return {
    totalAgents: allAgents.length,
    activeAgents: activeAgents.length,
    inactiveAgents: allAgents.length - activeAgents.length,
    agents: allAgents.map(a => ({
      id: a.config.id,
      name: a.config.name,
      isActive: a.isActive,
      hasWallet: !!a.wallet,
      publicKey: a.wallet?.publicKey.toBase58(),
    })),
  };
}

/**
 * Export agent data (for backup)
 */
export function exportAgentData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  
  for (const [agentId, agent] of registry) {
    data[agentId] = {
      config: {
        ...agent.config,
        // Don't export private keys
        privateKey: undefined,
        privateKeyEnvVar: undefined,
      },
      isActive: agent.isActive,
      createdAt: agent.createdAt.toISOString(),
      publicKey: agent.wallet?.publicKey.toBase58(),
    };
  }

  return data;
}

/**
 * Create agent configuration from template
 */
export function createAgentFromTemplate(
  id: string,
  name: string,
  template: 'trader' | 'analyzer' | 'monitor' | 'custom',
  customStrategy?: AgentStrategy
): AgentConfig {
  const baseConfig: AgentConfig = {
    id,
    name,
    description: '',
    strategy: 'moderate',
    autoStart: true,
    intervalMs: 20000,
  };

  switch (template) {
    case 'trader':
      return {
        ...baseConfig,
        description: 'Trading-focused agent with conservative strategy',
        strategy: 'conservative',
        intervalMs: 30000,
      };
    
    case 'analyzer':
      return {
        ...baseConfig,
        description: 'Analysis-focused agent with moderate strategy',
        strategy: 'moderate',
        intervalMs: 60000,
      };
    
    case 'monitor':
      return {
        ...baseConfig,
        description: 'High-frequency monitoring agent',
        strategy: 'aggressive',
        intervalMs: 10000,
      };
    
    case 'custom':
      return {
        ...baseConfig,
        description: 'Custom configured agent',
        strategy: customStrategy || 'moderate',
      };
    
    default:
      return baseConfig;
  }
}

export default {
  initializeRegistry,
  registerAgentConfig,
  loadAgentWallet,
  loadAllAgentWallets,
  getRegisteredAgent,
  getAllRegisteredAgents,
  getActiveAgents,
  updateAgentConfig,
  removeAgent,
  getAgentStrategy,
  setAgentStrategy,
  getRegistryStats,
  exportAgentData,
  createAgentFromTemplate,
  DEFAULT_AGENTS,
};
