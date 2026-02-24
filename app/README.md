# Agentic Wallets for AI Agents

A secure, autonomous, and scalable AI agent wallet system built on Solana Devnet. This MVP demonstrates programmatic wallet creation, autonomous decision-making, transaction signing, and multi-agent coordination.

![Agentic Wallets](https://img.shields.io/badge/Solana-Devnet-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Resources](#resources)

---

## Features

### Core Capabilities

- **Programmatic Wallet Creation** - Generate and manage multiple Solana wallets
- **Autonomous Decision-Making** - AI agents make independent transaction decisions
- **Transaction Signing** - Secure backend-only signing and submission
- **Multi-Agent Support** - Run 2-3 independent agent wallets in parallel
- **Devnet Deployment** - Safe testing environment with no real value at risk
- **Real-time Monitoring** - Dashboard for balances, transactions, and agent actions

### Agent Strategies

| Agent | Strategy | Risk Level | Interval |
|-------|----------|------------|----------|
| Alpha Trader | Conservative | Low | 20s |
| Beta Analyzer | Moderate | Medium | 25s |
| Gamma Monitor | Aggressive | High | 15s |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    (React + Vite)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Dashboard  │  │ Agent Cards │  │   Execution Logs    │ │
│  │  (Display)  │  │  (Monitor)  │  │    (History)        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ API Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│                    (TypeScript)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Agent     │  │   Wallet    │  │   Transaction       │ │
│  │  Controller │  │   Manager   │  │    Manager          │ │
│  │ (Orchestrate)│  │  (Keypairs) │  │  (Sign & Send)      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Agent     │  │   Solana    │  │   Agent             │ │
│  │   Brain     │  │   Client    │  │   Registry          │ │
│  │ (Decisions) │  │ (Connection)│  │  (Multi-Agent)      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ JSON RPC
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     SOLANA DEVNET                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Balance   │  │ Transaction │  │   Confirmation      │ │
│  │   Queries   │  │  Submission │  │    Monitoring       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Lishguy/agentic-wallet
cd agentic-wallet

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your agent private keys
```

### Environment Setup

```bash
# .env
VITE_AGENT_1_PRIVATE_KEY=your_agent_1_private_key_base58
VITE_AGENT_2_PRIVATE_KEY=your_agent_2_private_key_base58
VITE_AGENT_3_PRIVATE_KEY=your_agent_3_private_key_base58
```

To generate new keys:

```bash
# Run the key generation script
npm run generate-keys
```

### Running the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Airdrop SOL for Testing

```bash
# Using Solana CLI
solana airdrop 2 <PUBLIC_KEY> --url devnet

# Or use the dashboard "Airdrop" button
```

---

## Documentation

### Core Modules

| Module | Purpose | Resource |
|--------|---------|----------|
| `solanaClient.ts` | Devnet connection | [Solana JSON RPC](https://solana.com/docs/rpc) |
| `walletManager.ts` | Keypair management | [Solana Operators](https://launch.solana.com/docs/kora/operators) |
| `transactionManager.ts` | Transaction signing | [Solana JSON RPC](https://solana.com/docs/rpc) |
| `agentBrain.ts` | AI decision logic | Custom implementation |
| `agentController.ts` | Orchestration | Custom implementation |
| `agentRegistry.ts` | Multi-agent setup | Custom implementation |

### Additional Documentation

- [Agent Skills & Capabilities](./agents/SKILLS.md)
- [Security Guide](./SECURITY.md)

---

## Project Structure

```
solana-agent-wallet/
│
├── app/
│   ├── api/
│   │   └── agent/
│   │       └── route.ts          # Backend API for agent execution
│   └── page.tsx                  # Frontend dashboard
│
├── lib/
│   ├── solanaClient.ts           # Solana Devnet connection
│   ├── walletManager.ts          # Wallet creation & management
│   ├── transactionManager.ts     # Transaction signing & sending
│   ├── agentBrain.ts             # AI decision-making logic
│   └── agentController.ts        # Agent orchestration
│
├── agents/
│   ├── agentRegistry.ts          # Multi-agent configuration
│   └── SKILLS.md                 # Agent capabilities documentation
│
├── src/
│   ├── App.tsx                   # Main dashboard component
│   ├── App.css                   # Custom styles
│   └── main.tsx                  # Application entry
│
├── README.md                     # This file
├── SECURITY.md                   # Security best practices
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite configuration
└── tailwind.config.js            # Tailwind CSS config
```

---

## API Reference

### Agent Controller

```typescript
// Run a single agent
const result = await runAgent('agent-1');

// Run all agents
const results = await runAllAgents();

// Start autonomous loop
const stopLoop = startAutonomousLoop(15000, (results) => {
  console.log('Agent results:', results);
});

// Stop autonomous loop
stopLoop();
```

### Wallet Manager

```typescript
// Create new wallet
const wallet = createWallet('agent-4', 'Delta Trader');

// Load from private key
const wallet = loadWalletFromPrivateKey('agent-4', 'Delta Trader', privateKeyBase58);

// Get wallet info (safe)
const info = getWalletInfo(wallet);
// { id, name, publicKey, createdAt }
```

### Transaction Manager

```typescript
// Send SOL
const result = await sendSOL(
  fromKeypair,
  toPublicKey,
  0.1 // SOL amount
);

// Request airdrop
const result = await requestAirdrop(publicKey, 1);

// Get transaction status
const status = await getTransactionStatus(signature);
```

---

## Agent Decision Flow

```
┌──────────────┐
│   Trigger    │  (Manual or Auto)
└──────┬───────┘
       ▼
┌──────────────┐
│ Load Wallet  │  (From secure storage)
└──────┬───────┘
       ▼
┌──────────────┐
│ Get Balance  │  (JSON RPC: getBalance)
└──────┬───────┘
       ▼
┌──────────────┐
│ Agent Brain  │  (Decision making)
│  Decision    │
└──────┬───────┘
       ▼
┌──────────────┐
│  Execute     │  (If action required)
│ Transaction  │
└──────┬───────┘
       ▼
┌──────────────┐
│   Confirm    │  (Monitor confirmation)
└──────┬───────┘
       ▼
┌──────────────┐
│   Return     │  (Result + Explorer link)
│   Result     │
└──────────────┘
```

---

## Resources

### Solana Documentation

- [Solana JSON RPC API](https://solana.com/docs/rpc) - Core API for blockchain interaction
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) - JavaScript SDK
- [Solana Operators Guide](https://launch.solana.com/docs/kora/operators) - Wallet management best practices
- [Solana Wallets](https://solana.com/wallets) - Wallet adapter reference

### Devnet Resources

- [Solana Devnet Explorer](https://explorer.solana.com/?cluster=devnet) - View transactions
- [Devnet Faucet](https://faucet.solana.com/) - Request free SOL

### Development Tools

- [Vite](https://vitejs.dev/) - Build tool
- [React](https://react.dev/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lucide Icons](https://lucide.dev/) - Icon library

---

## Security

See [SECURITY.md](./SECURITY.md) for detailed security guidelines.

### Key Points

- **Private keys never in frontend**
- **Environment variable storage only**
- **Backend-only transaction signing**
- **Devnet sandbox for testing**
- **Clear separation of concerns**

---

## Troubleshooting

### Common Issues

**Issue:** `Error: Environment variable VITE_AGENT_1_PRIVATE_KEY not found`

**Solution:** Create `.env` file and add the private keys:
```bash
cp .env.example .env
# Edit .env with your keys
```

---

**Issue:** `Error: insufficient funds for transaction`

**Solution:** Request airdrop from Devnet faucet:
```bash
solana airdrop 2 <PUBLIC_KEY> --url devnet
```

---

**Issue:** `Error: Rate limit exceeded`

**Solution:** Wait a few seconds between requests. Devnet has rate limiting.

---

**Issue:** `Transaction confirmation timeout`

**Solution:** 
- Check network connection
- Verify Devnet status at [Solana Status](https://status.solana.com/)
- Increase timeout in `solanaClient.ts`

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Ensure security compliance

---

## License

MIT License - see LICENSE file for details.

---

## Acknowledgments

- Solana Labs for the excellent documentation and tools
- The Web3 community for inspiration and best practices
- Contributors and testers

---

## Contact

For questions or support:
- Open an issue on GitHub
- Contact the development team

---

**Built with ❤️ on Solana Devnet**
