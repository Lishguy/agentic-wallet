# Security Guide for Agentic Wallets

This document outlines security best practices and considerations for the Agentic Wallets system.

## Table of Contents

1. [Key Management](#key-management)
2. [Environment Variables](#environment-variables)
3. [Frontend Security](#frontend-security)
4. [Backend Security](#backend-security)
5. [Transaction Security](#transaction-security)
6. [Devnet Safety](#devnet-safety)
7. [Deployment Security](#deployment-security)

---

## Key Management

### Private Key Storage

**CRITICAL:** Private keys must never be:
- Committed to version control
- Exposed in frontend code
- Logged to console in production
- Sent over unencrypted connections
- Stored in localStorage or cookies

### Secure Storage Practices

```bash
# Use environment variables (.env file)
VITE_AGENT_1_PRIVATE_KEY=your_base58_encoded_private_key_here
VITE_AGENT_2_PRIVATE_KEY=your_base58_encoded_private_key_here
VITE_AGENT_3_PRIVATE_KEY=your_base58_encoded_private_key_here
```

```typescript
// Load from environment in backend only
const privateKey = process.env.VITE_AGENT_1_PRIVATE_KEY;
const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
```

### Key Generation

```typescript
// Generate new keypair
const keypair = Keypair.generate();

// Export for secure storage
const privateKey = bs58.encode(keypair.secretKey);
const publicKey = keypair.publicKey.toBase58();

// SAVE THESE SECURELY - they cannot be recovered!
console.log('Private Key (save to .env):', privateKey);
console.log('Public Key (for reference):', publicKey);
```

### Key Rotation

- Rotate keys periodically (recommended: every 90 days)
- Generate new keys before decommissioning old ones
- Update environment variables immediately after rotation
- Test new keys before removing old ones

---

## Environment Variables

### Required Variables

```bash
# Agent Private Keys (Base58 encoded)
VITE_AGENT_1_PRIVATE_KEY=
VITE_AGENT_2_PRIVATE_KEY=
VITE_AGENT_3_PRIVATE_KEY=

# Optional: Custom RPC endpoint (defaults to public Devnet)
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# Optional: Commitment level
VITE_COMMITMENT_LEVEL=confirmed
```

### .env.example

See `.env.example` file for template.

### .gitignore

Ensure `.env` is in `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Secrets
*.key
*.pem
secrets/
```

---

## Frontend Security

### What the Frontend CANNOT Do

```typescript
// ❌ NEVER do this in frontend
const keypair = Keypair.generate(); // Exposes private key
const signature = keypair.sign(message); // Exposes signing
```

### What the Frontend CAN Do

```typescript
// ✅ Safe frontend operations
const publicKey = wallet.publicKey; // Only public key
const balance = await connection.getBalance(publicKey); // Read-only
const transaction = await fetch('/api/agent', { method: 'POST' }); // Delegate to backend
```

### Frontend Architecture

```
┌─────────────────┐
│   Frontend      │  React + Vite
│   (Read-Only)   │  - Display balances
│                 │  - Show transactions
│                 │  - Trigger actions
└────────┬────────┘
         │ API Calls
         ▼
┌─────────────────┐
│   Backend       │  Node.js / API Routes
│   (Secure)      │  - Key management
│                 │  - Transaction signing
│                 │  - Agent logic
└────────┬────────┘
         │ JSON RPC
         ▼
┌─────────────────┐
│   Solana        │  Devnet
│   Blockchain    │  - Confirm transactions
│                 │  - Store state
└─────────────────┘
```

---

## Backend Security

### Secure Key Loading

```typescript
// lib/walletManager.ts
export function loadWalletFromEnv(envVarName: string): AgentWallet {
  const privateKey = process.env[envVarName];
  
  if (!privateKey) {
    throw new Error(`Environment variable ${envVarName} not found`);
  }

  // Validate key format
  try {
    const decoded = bs58.decode(privateKey);
    if (decoded.length !== 64) {
      throw new Error('Invalid private key length');
    }
  } catch (error) {
    throw new Error(`Invalid private key format: ${error}`);
  }

  return loadWalletFromPrivateKey(privateKey);
}
```

### Transaction Signing Security

```typescript
// lib/transactionManager.ts
export async function sendSOL(
  fromKeypair: Keypair,  // Secure keypair from backend
  toPublicKey: PublicKey,
  amountSOL: number
): Promise<TransferResult> {
  // 1. Validate recipient
  if (!isValidPublicKey(toPublicKey)) {
    throw new Error('Invalid recipient public key');
  }

  // 2. Validate amount
  if (amountSOL <= 0 || amountSOL > MAX_TRANSFER_AMOUNT) {
    throw new Error('Invalid transfer amount');
  }

  // 3. Create and sign transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports: amountSOL * LAMPORTS_PER_SOL,
    })
  );

  // 4. Sign (never expose private key)
  transaction.sign(fromKeypair);

  // 5. Send raw transaction (signature only)
  return connection.sendRawTransaction(transaction.serialize());
}
```

### API Route Protection

```typescript
// app/api/agent/route.ts
export async function POST(request: Request) {
  // 1. Validate request
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // 2. Rate limiting (implement based on your needs)
  // const rateLimitResult = await checkRateLimit(request);
  // if (!rateLimitResult.allowed) {
  //   return new Response('Rate limit exceeded', { status: 429 });
  // }

  // 3. Execute agent (secure context)
  try {
    const result = await runAgent(agentId);
    return Response.json(result);
  } catch (error) {
    // 4. Don't expose internal errors
    console.error('Agent execution error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

---

## Transaction Security

### Transaction Validation

```typescript
// Validate before signing
function validateTransaction(tx: Transaction): boolean {
  // Check fee payer
  if (!tx.feePayer) return false;

  // Check recent blockhash
  if (!tx.recentBlockhash) return false;

  // Check instructions
  for (const instruction of tx.instructions) {
    // Validate program IDs
    if (!isKnownProgram(instruction.programId)) {
      console.warn('Unknown program:', instruction.programId.toBase58());
    }
  }

  return true;
}
```

### Amount Limits

```typescript
// Strategy-based limits
const STRATEGY_LIMITS = {
  conservative: {
    maxTransferSOL: 0.1,
    maxDailyVolume: 1.0,
  },
  moderate: {
    maxTransferSOL: 0.2,
    maxDailyVolume: 2.0,
  },
  aggressive: {
    maxTransferSOL: 0.5,
    maxDailyVolume: 5.0,
  },
};

// Enforce limits
function checkTransferLimit(
  amount: number, 
  strategy: keyof typeof STRATEGY_LIMITS
): boolean {
  return amount <= STRATEGY_LIMITS[strategy].maxTransferSOL;
}
```

---

## Devnet Safety

### Why Devnet?

- **No Real Value:** Devnet SOL has no monetary value
- **Safe Testing:** Test autonomous behavior without risk
- **Free Airdrops:** Request SOL from faucet for testing
- **Resettable:** Devnet can be reset, clearing all state

### Devnet Limitations

```typescript
// Airdrop rate limiting
const AIRDROP_COOLDOWN = 60000; // 1 minute between requests
const MAX_AIRDROP_AMOUNT = 2; // Maximum 2 SOL per request

// Transaction limits
const MAX_TRANSACTIONS_PER_MINUTE = 10;
```

### Moving to Mainnet

**WARNING:** Only move to Mainnet after:

1. Extensive Devnet testing
2. Security audit
3. Multi-sig setup for large amounts
4. Insurance/backup plan
5. Legal compliance review

```typescript
// Switch to mainnet (NOT RECOMMENDED for MVP)
const MAINNET_URL = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(MAINNET_URL, 'confirmed');
```

---

## Deployment Security

### Vercel/Netlify Deployment

1. **Set Environment Variables:**
   - Go to project settings
   - Add environment variables securely
   - Never commit `.env` file

2. **Build Settings:**
   ```bash
   npm run build
   ```

3. **Security Headers:**
   ```javascript
   // vercel.json or netlify.toml
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "X-Content-Type-Options",
             "value": "nosniff"
           },
           {
             "key": "X-Frame-Options",
             "value": "DENY"
           }
         ]
       }
     ]
   }
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine

# Don't copy .env file
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Environment variables passed at runtime
ENV VITE_AGENT_1_PRIVATE_KEY=""
ENV VITE_AGENT_2_PRIVATE_KEY=""
ENV VITE_AGENT_3_PRIVATE_KEY=""

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Security Checklist

### Before Deployment

- [ ] `.env` file is in `.gitignore`
- [ ] No private keys in code
- [ ] No console.log of sensitive data
- [ ] Rate limiting implemented
- [ ] Error messages don't expose internals
- [ ] HTTPS enabled
- [ ] Security headers configured

### Regular Maintenance

- [ ] Rotate keys every 90 days
- [ ] Review access logs
- [ ] Update dependencies
- [ ] Monitor for unusual activity
- [ ] Backup key recovery phrases

---

## Incident Response

### If Private Key is Exposed

1. **Immediately:**
   - Rotate the exposed key
   - Transfer any funds to new key
   - Revoke any associated permissions

2. **Investigation:**
   - Check transaction history
   - Review access logs
   - Identify exposure source

3. **Prevention:**
   - Update security procedures
   - Train team members
   - Implement additional safeguards

---

## References

- [Solana Security Best Practices](https://solana.com/docs/advanced/security)
- [Web3 Security Guide](https://github.com/ethereum/wiki/wiki/Safety)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## Contact

For security concerns or vulnerabilities, please contact the development team.
