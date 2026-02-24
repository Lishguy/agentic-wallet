# Agent Skills & Capabilities

This document describes the capabilities and skills of each AI agent in the Agentic Wallets system.

## Overview

Our agentic wallet system consists of multiple autonomous AI agents, each with specialized capabilities for managing Solana wallets and executing transactions on the Devnet.

---

## Agent Types

### 1. Alpha Trader (agent-1)

**Strategy:** Conservative  
**Risk Level:** Low  
**Interval:** 20 seconds

#### Capabilities
- **Balance Monitoring:** Continuously monitors wallet balance
- **Conservative Transfers:** Only transfers when balance exceeds 1.0 SOL
- **Capital Preservation:** Prioritizes maintaining minimum balance of 0.5 SOL
- **Small Transfers:** Maximum transfer amount of 0.1 SOL per transaction

#### Decision Logic
```
IF balance < 0.5 SOL:
    REQUEST_AIRDROP or WAIT
ELSE IF balance > 1.0 SOL:
    TRANSFER_SOL (max 0.1 SOL)
ELSE:
    HOLD
```

#### Use Cases
- Treasury management
- Safe automated trading
- Conservative portfolio management

---

### 2. Beta Analyzer (agent-2)

**Strategy:** Moderate  
**Risk Level:** Medium  
**Interval:** 25 seconds

#### Capabilities
- **Market Analysis:** Simulated market condition analysis
- **Moderate Transfers:** Transfers when balance exceeds 0.8 SOL
- **Balanced Approach:** Maintains minimum balance of 0.3 SOL
- **Medium Transfers:** Maximum transfer amount of 0.2 SOL per transaction

#### Decision Logic
```
IF balance < 0.3 SOL:
    REQUEST_AIRDROP or WAIT
ELSE IF balance > 0.8 SOL:
    TRANSFER_SOL (max 0.2 SOL)
ELSE:
    HOLD
```

#### Use Cases
- Balanced portfolio management
- Automated rebalancing
- Moderate risk trading strategies

---

### 3. Gamma Monitor (agent-3)

**Strategy:** Aggressive  
**Risk Level:** High  
**Interval:** 15 seconds

#### Capabilities
- **High-Frequency Monitoring:** Checks balance every 15 seconds
- **Aggressive Transfers:** Transfers when balance exceeds 0.5 SOL
- **Lower Thresholds:** Maintains minimum balance of 0.1 SOL
- **Larger Transfers:** Maximum transfer amount of 0.5 SOL per transaction

#### Decision Logic
```
IF balance < 0.1 SOL:
    REQUEST_AIRDROP or WAIT
ELSE IF balance > 0.5 SOL:
    TRANSFER_SOL (max 0.5 SOL)
ELSE:
    HOLD
```

#### Use Cases
- High-frequency trading simulation
- Aggressive growth strategies
- Rapid response to market conditions

---

## Common Agent Actions

### TRANSFER_SOL
- **Description:** Transfer SOL to another wallet
- **Parameters:**
  - `amount`: Amount of SOL to transfer
  - `recipient`: Target wallet address
  - `reason`: Decision rationale
- **Autonomous:** Yes, fully autonomous with pre-configured recipients

### HOLD
- **Description:** Maintain current position, no action taken
- **Trigger:** Balance within acceptable range
- **Rationale:** Preserve capital, wait for better conditions

### REQUEST_AIRDROP
- **Description:** Request SOL airdrop from Devnet faucet
- **Amount:** 1 SOL per request
- **Limitation:** Devnet only, subject to rate limits

### WAIT
- **Description:** Pause execution for specified duration
- **Trigger:** Low balance or unfavorable conditions
- **Duration:** Configurable (default 30 seconds)

---

## Agent Brain Architecture

### Decision Making Process

1. **Balance Assessment**
   - Query current SOL balance via JSON RPC
   - Compare against strategy thresholds

2. **Context Analysis**
   - Check market conditions (simulated)
   - Review recent transaction history
   - Evaluate pending tasks

3. **Decision Generation**
   - Apply strategy rules
   - Calculate confidence score
   - Select appropriate action

4. **Execution**
   - Sign transaction with agent's keypair
   - Submit to Solana Devnet
   - Monitor confirmation status

### Confidence Scoring

Agents assign confidence scores (0-1) to each decision:
- **0.9-1.0:** Very high confidence (clear conditions met)
- **0.7-0.9:** High confidence (favorable conditions)
- **0.5-0.7:** Moderate confidence (uncertain conditions)
- **<0.5:** Low confidence (unfavorable conditions)

---

## Extending Agent Capabilities

### Adding New Strategies

```typescript
const customStrategy: AgentStrategy = {
  minBalanceSOL: 0.2,
  maxTransferAmountSOL: 0.3,
  transferThresholdSOL: 0.6,
  riskLevel: 'moderate',
  preferredRecipients: ['recipient1', 'recipient2'],
};
```

### Integrating External AI

The Agent Brain can be extended to integrate with:
- OpenAI GPT models for natural language decision rationale
- Custom ML models for price prediction
- External APIs for market data

Example:
```typescript
async function makeDecisionWithAI(balance: number): Promise<AgentDecision> {
  const marketData = await fetchMarketData();
  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "system",
      content: `Balance: ${balance} SOL, Market: ${marketData.trend}`
    }]
  });
  // Parse AI response into decision
}
```

---

## Security Considerations

- Agents never expose private keys
- All signing happens in secure backend context
- Devnet-only operation prevents real fund loss
- Decision logs provide full audit trail

---

## Monitoring & Observability

Each agent exposes:
- **Decision History:** Last 10 decisions with timestamps
- **Statistics:** Total decisions, transfer count, average confidence
- **Execution Results:** Transaction signatures, success/failure status
- **Explorer Links:** Direct links to Solana Devnet Explorer

---

## Future Enhancements

### Planned Capabilities

1. **SPL Token Support**
   - Transfer USDC, USDT, and other tokens
   - Automated token swaps
   - Liquidity provision

2. **DeFi Integration**
   - Lending/borrowing on Solana protocols
   - Yield farming automation
   - Staking operations

3. **Cross-Agent Communication**
   - Agent-to-agent transactions
   - Collaborative decision making
   - Multi-sig operations

4. **Advanced AI Integration**
   - GPT-4 for complex decision making
   - Sentiment analysis from social media
   - On-chain data analysis

---

## References

- [Solana JSON RPC API](https://solana.com/docs/rpc)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Agent Controller](../lib/agentController.ts)
- [Agent Brain](../lib/agentBrain.ts)
