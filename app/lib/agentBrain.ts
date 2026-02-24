/**
 * Agent Brain Module
 * 
 * AI decision logic for autonomous agent behavior
 * Rule-based initially, can integrate OpenAI or other AI models later
 * 
 * Makes decisions based on:
 * - Wallet balance
 * - Market conditions (simulated)
 * - Agent's defined strategy
 */

export type AgentAction = 
  | { type: 'TRANSFER_SOL'; amount: number; recipient: string; reason: string }
  | { type: 'HOLD'; reason: string }
  | { type: 'REQUEST_AIRDROP'; reason: string }
  | { type: 'WAIT'; reason: string; durationMs?: number };

export interface AgentDecision {
  action: AgentAction;
  confidence: number;
  timestamp: Date;
  agentId: string;
}

export interface AgentStrategy {
  minBalanceSOL: number;
  maxTransferAmountSOL: number;
  transferThresholdSOL: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  preferredRecipients?: string[];
}

// Default strategies for different agent types
export const DEFAULT_STRATEGIES: Record<string, AgentStrategy> = {
  'conservative': {
    minBalanceSOL: 0.5,
    maxTransferAmountSOL: 0.1,
    transferThresholdSOL: 1.0,
    riskLevel: 'conservative',
  },
  'moderate': {
    minBalanceSOL: 0.3,
    maxTransferAmountSOL: 0.2,
    transferThresholdSOL: 0.8,
    riskLevel: 'moderate',
  },
  'aggressive': {
    minBalanceSOL: 0.1,
    maxTransferAmountSOL: 0.5,
    transferThresholdSOL: 0.5,
    riskLevel: 'aggressive',
  },
};

/**
 * Agent Brain - Makes autonomous decisions for the agent
 */
export class AgentBrain {
  private strategy: AgentStrategy;
  private decisionHistory: AgentDecision[] = [];
  private lastDecisionTime: Date | null = null;
  private agentId: string;
  private agentName: string;

  constructor(
    agentId: string,
    agentName: string,
    strategyOrType: AgentStrategy | string = 'moderate'
  ) {
    this.agentId = agentId;
    this.agentName = agentName;
    
    if (typeof strategyOrType === 'string') {
      this.strategy = DEFAULT_STRATEGIES[strategyOrType] || DEFAULT_STRATEGIES.moderate;
    } else {
      this.strategy = strategyOrType;
    }
  }

  /**
   * Main decision-making function
   * Analyzes balance and decides on action
   */
  async makeDecision(
    balanceSOL: number,
    additionalContext?: {
      recentTransactions?: unknown[];
      marketCondition?: 'bullish' | 'bearish' | 'neutral';
      pendingTasks?: string[];
    }
  ): Promise<AgentDecision> {
    console.log(`[AgentBrain:${this.agentId}] Making decision with balance: ${balanceSOL} SOL`);

    let action: AgentAction;
    let confidence: number;

    // Decision logic based on balance and strategy
    if (balanceSOL < this.strategy.minBalanceSOL) {
      // Balance too low - request airdrop or wait
      if (balanceSOL < 0.01) {
        action = {
          type: 'REQUEST_AIRDROP',
          reason: `Balance (${balanceSOL.toFixed(4)} SOL) below minimum threshold (${this.strategy.minBalanceSOL} SOL)`,
        };
        confidence = 0.95;
      } else {
        action = {
          type: 'WAIT',
          reason: `Low balance (${balanceSOL.toFixed(4)} SOL), waiting for better conditions`,
          durationMs: 30000,
        };
        confidence = 0.7;
      }
    } else if (balanceSOL > this.strategy.transferThresholdSOL) {
      // Balance sufficient - consider transfer
      const transferAmount = Math.min(
        this.strategy.maxTransferAmountSOL,
        balanceSOL * 0.1 // Transfer max 10% of balance
      );

      if (transferAmount >= 0.001 && this.strategy.preferredRecipients && this.strategy.preferredRecipients.length > 0) {
        // Select a recipient (round-robin or random)
        const recipient = this.selectRecipient();
        
        action = {
          type: 'TRANSFER_SOL',
          amount: transferAmount,
          recipient,
          reason: `Balance (${balanceSOL.toFixed(4)} SOL) above threshold, executing strategic transfer of ${transferAmount.toFixed(4)} SOL`,
        };
        confidence = 0.85;
      } else {
        action = {
          type: 'HOLD',
          reason: `Balance healthy (${balanceSOL.toFixed(4)} SOL), no recipients configured - holding position`,
        };
        confidence = 0.8;
      }
    } else {
      // Balance in middle range - hold
      action = {
        type: 'HOLD',
        reason: `Balance (${balanceSOL.toFixed(4)} SOL) within acceptable range, maintaining position`,
      };
      confidence = 0.9;
    }

    // Adjust based on market conditions if provided
    if (additionalContext?.marketCondition) {
      const marketAdjustment = this.adjustForMarket(additionalContext.marketCondition);
      confidence = Math.min(1, Math.max(0, confidence + marketAdjustment));
    }

    const decision: AgentDecision = {
      action,
      confidence,
      timestamp: new Date(),
      agentId: this.agentId,
    };

    this.decisionHistory.push(decision);
    this.lastDecisionTime = decision.timestamp;

    console.log(`[AgentBrain:${this.agentId}] Decision: ${action.type} (confidence: ${confidence})`);
    
    return decision;
  }

  /**
   * Select recipient from preferred list
   */
  private selectRecipient(): string {
    if (!this.strategy.preferredRecipients || this.strategy.preferredRecipients.length === 0) {
      // Default recipient (another agent or treasury)
      return 'treasury';
    }
    
    // Random selection for now
    const index = Math.floor(Math.random() * this.strategy.preferredRecipients.length);
    return this.strategy.preferredRecipients[index];
  }

  /**
   * Adjust confidence based on market conditions
   */
  private adjustForMarket(condition: 'bullish' | 'bearish' | 'neutral'): number {
    switch (this.strategy.riskLevel) {
      case 'conservative':
        return condition === 'bearish' ? 0.1 : condition === 'bullish' ? -0.1 : 0;
      case 'moderate':
        return condition === 'bullish' ? 0.1 : condition === 'bearish' ? -0.05 : 0;
      case 'aggressive':
        return condition === 'bullish' ? 0.15 : condition === 'bearish' ? -0.1 : 0;
      default:
        return 0;
    }
  }

  /**
   * Get decision history
   */
  getDecisionHistory(limit: number = 10): AgentDecision[] {
    return this.decisionHistory.slice(-limit);
  }

  /**
   * Get last decision
   */
  getLastDecision(): AgentDecision | null {
    return this.decisionHistory[this.decisionHistory.length - 1] || null;
  }

  /**
   * Update strategy
   */
  updateStrategy(newStrategy: Partial<AgentStrategy>): void {
    this.strategy = { ...this.strategy, ...newStrategy };
    console.log(`[AgentBrain:${this.agentId}] Strategy updated:`, this.strategy);
  }

  /**
   * Get current strategy
   */
  getStrategy(): AgentStrategy {
    return { ...this.strategy };
  }

  /**
   * Get agent stats
   */
  getStats() {
    const totalDecisions = this.decisionHistory.length;
    const transferDecisions = this.decisionHistory.filter(d => d.action.type === 'TRANSFER_SOL').length;
    const holdDecisions = this.decisionHistory.filter(d => d.action.type === 'HOLD').length;
    const avgConfidence = totalDecisions > 0
      ? this.decisionHistory.reduce((sum, d) => sum + d.confidence, 0) / totalDecisions
      : 0;

    return {
      agentId: this.agentId,
      agentName: this.agentName,
      totalDecisions,
      transferDecisions,
      holdDecisions,
      avgConfidence: avgConfidence.toFixed(2),
      lastDecisionTime: this.lastDecisionTime,
      strategy: this.strategy,
    };
  }
}

/**
 * Create a new agent brain instance
 */
export function createAgentBrain(
  agentId: string,
  agentName: string,
  strategy?: AgentStrategy | string
): AgentBrain {
  return new AgentBrain(agentId, agentName, strategy);
}

export default AgentBrain;
