# Message With Tokens - XMTP Fee Demo App

## Overview

A demo web app that teaches developers how XMTP messaging fees work by letting them experience the system firsthand. The user plays the role of a developer: they connect a wallet, fund a payer balance, create multiple "users" (ephemeral identities), and send messages - all while seeing real-time cost breakdowns.

**Key educational goals:**
- Demonstrate that apps pay for messaging, not end users
- Show how multiple identities can share a single payer balance
- Display actual message costs based on payload size
- Illustrate the funding flow: mUSD faucet → deposit → send

## Scope

### In Scope (v1)
- Developer wallet connection (MetaMask, WalletConnect)
- mUSD faucet minting (testnet only)
- Permit-based deposit to PayerRegistry (2 confirmations + 1 signature)
- Multiple ephemeral "users" (browser-generated EOA keys, localStorage)
- DM messaging to:
  - hi.xmtp.eth (demo recipient)
  - Custom addresses/ENS names
  - Between local users
- Group chat creation and messaging
- Real-time message cost display (based on actual payload bytes)
- "Messages available" balance counter
- Message history persistence (XMTP OPFS database)
- ENS resolution for recipients
- Reachability check before sending (`canMessage`)
- Railway deployment (frontend + gateway sidecar)

### Out of Scope (Later)
- Mainnet USDC onramp/swap
- Withdrawal flow from PayerRegistry
- Real passkey/WebAuthn support (using ephemeral EOAs for now)
- Read receipts, typing indicators
- Media attachments beyond text

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Railway                               │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │   Frontend (Vite)    │    │   Gateway Service          │ │
│  │   - React + Shadcn   │───▶│   - xmtp/xmtpd-gateway     │ │
│  │   - wagmi/viem       │    │   - PAYER_PRIVATE_KEY      │ │
│  │   - @xmtp/browser-sdk│    │   - Testnet config         │ │
│  └──────────────────────┘    └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     External Services                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Base Sepolia │  │ XMTP Testnet │  │ Ethereum Mainnet │  │
│  │ (mUSD, Payer │  │ (Messaging)  │  │ (ENS Resolution) │  │
│  │  Registry)   │  │              │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Payer-Gateway Relationship (CRITICAL)

The gateway runs with a pre-configured `PAYER_PRIVATE_KEY`. This payer address is public and displayed in the app. When developers deposit mUSD, they deposit **to the gateway's payer address**, not their own wallet's payer balance.

```
Gateway Payer Address: 0x... (derived from PAYER_PRIVATE_KEY)
                          ↑
                          │ Developer deposits TO this address
                          │
┌─────────────────────────┴──────────────────────────┐
│  Developer Wallet                                   │
│  - Signs permit (no gas)                           │
│  - Executes deposit tx (pays gas)                  │
│  - Receives mUSD from faucet                       │
│  - Does NOT become a payer itself                  │
└────────────────────────────────────────────────────┘
```

This teaches the real-world model: an app operator pre-funds a payer, and the app's users benefit from that balance.

**UI NOTE**: Display "This is a shared demo payer. Balance reflects all deposits and all usage." so users understand the cumulative nature.

### Data Flow

1. **Developer connects wallet** → wagmi/viem → MetaMask/WalletConnect
2. **Mints mUSD** → MockUnderlyingFeeToken.mint() to developer wallet
3. **Deposits to gateway payer** → Sign EIP-2612 permit → DepositSplitter deposits to gateway's payer address
4. **Creates users** → viem generatePrivateKey() → localStorage (independent of payer)
5. **Sends message** → XMTP browser-sdk → Gateway → XMTP Network (gateway's payer pays)
6. **Query balance** → PayerRegistry.balance(GATEWAY_PAYER_ADDRESS) → Display "N messages available"

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite |
| UI | Shadcn/ui (via MCP) |
| Styling | Tailwind CSS |
| Wallet | wagmi v2 + viem |
| Messaging | @xmtp/browser-sdk |
| State | React Context + @mantine/hooks (localStorage) |
| Gateway | Docker: xmtp/xmtpd-gateway:main |
| Deployment | Railway (both services) |
| Network | XMTP testnet-staging, Base Sepolia |

## Key Patterns to Reuse

### From Funding Portal (~/Developer/funding-portal)
- `src/components/ui/faucet/FaucetDialog.tsx` - Faucet UI pattern
- `src/hooks/contracts/useMintMusd.ts` - mUSD minting with rate limiting
- `src/hooks/contracts/useFundingFlow.ts` - Deposit flow with permit
- `src/utils/messageCosting.ts` - Fee calculation formula
- `src/hooks/contracts/useRateRegistry.ts` - On-chain rate fetching
- `src/constants/tokens.ts` - Token addresses (UNDERLYING_FEE_TOKEN)
- `environments/testnet-staging.json` - Contract addresses

### From xmtp.chat (/tmp/xmtp-js/apps/xmtp.chat)
- `src/hooks/useEphemeralSigner.ts` - Ephemeral key generation
- `src/helpers/createSigner.ts` - XMTP Signer creation
- `src/hooks/useSettings.ts` - localStorage persistence pattern
- `src/contexts/XMTPContext.tsx` - XMTP client lifecycle

## Fee Calculation

```typescript
// From messageCosting.ts
cost = (messageFee + storageFee * bytes * days + congestionFee) * gasOverhead

// Current testnet values:
// messageFee: 38,500,000 picodollars (~$0.0000385)
// storageFee: 22 picodollars/byte/day
// days: 60 (default retention)
// congestionFee: 0 (currently)
// gasOverhead: 1.25x
```

For a 100-byte message: ~$0.00005
For a 1KB message: ~$0.00017

**IMPLEMENTATION NOTE**: Verify these example costs against actual RateRegistry values before implementing fn-1.9 (Cost Display). The formula and examples should match exactly.

## User Flows

### 1. First-Time Setup (Developer)
1. Land on app → See "Connect Wallet" and "0 messages available"
2. Connect MetaMask/WalletConnect
3. Click "Get Test Funds" → Faucet mints 1000 mUSD (1 tx)
4. Click "Deposit" → Sign permit (1 sig) → Deposit tx (1 tx)
5. Balance updates → "~20,000 messages available"

### 2. Create User
1. Click "Add User"
2. Enter display name (e.g., "Alice")
3. App generates ephemeral key, stores in localStorage
4. User appears in sidebar, ready to send

### 3. Send DM
1. Select user from sidebar
2. Enter recipient (ENS or address)
3. App checks `canMessage()` → Show reachability
4. Type message → See estimated cost updating
5. Click Send → Message delivered → Balance decrements

### 4. Create Group
1. Select user
2. Click "New Group"
3. Add members (ENS/addresses)
4. Name the group
5. Create → Group appears in conversation list

## Quick Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start gateway (requires env vars)
docker run -p 5050:5050 -e XMTPD_PAYER_PRIVATE_KEY=$PAYER_KEY xmtp/xmtpd-gateway:main

# Run tests
npm test

# Build for production
npm run build
```

## Environment Variables

```bash
# Frontend
VITE_GATEWAY_URL=http://localhost:5050  # or Railway internal URL
VITE_SETTLEMENT_CHAIN_RPC_URL=https://sepolia.base.org
VITE_APP_CHAIN_RPC_URL=https://xmtp-testnet.g.alchemy.com/public
VITE_MAINNET_RPC_URL=https://eth.llamarpc.com  # ENS resolution
VITE_WALLETCONNECT_PROJECT_ID=xxx

# Gateway
XMTPD_PAYER_PRIVATE_KEY=0x...  # Developer's payer wallet
```

## Acceptance Criteria

1. **Wallet Connection**: Can connect MetaMask and see wallet address
2. **Faucet**: Can mint 1000 mUSD with rate limiting (2hr cooldown)
3. **Deposit**: Can deposit mUSD with permit signature (2 confirmations total)
4. **Balance Display**: Shows "N messages available" calculated from balance
5. **User Creation**: Can create multiple named users stored in localStorage
6. **User Switching**: Can switch between users, each with own XMTP client
7. **DM Sending**: Can send DM to hi.xmtp.eth and see message appear
8. **ENS Resolution**: Can enter ENS name and resolve to address
9. **Reachability**: Shows whether recipient can receive XMTP messages
10. **Cost Display**: Shows estimated cost before sending, actual after
11. **Group Chat**: Can create group with multiple members and send messages
12. **Balance Decrement**: Balance decreases after sending messages
13. **Persistence**: Wallet connection, users, and messages persist on refresh

## Edge Cases to Handle

- **OPFS Conflict**: Close client before switching users
- **localStorage Cleared**: Graceful recovery (re-create users)
- **Gateway Down**: Show error state, retry logic
- **Insufficient Balance**: Block send, show "Add funds" prompt
- **ENS Not Found**: Show "Address not found" error
- **Recipient Not Reachable**: Show "Not on XMTP" message
- **Rate Limited (Faucet)**: Show countdown timer

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Gateway image instability (`:main` tag) | Pin to specific SHA if issues arise |
| Testnet data loss | Document that this is ephemeral demo |
| ENS resolution latency | Cache resolved addresses |
| OPFS browser support | Feature detect, show unsupported message |

## References

- XMTP Funding Portal: `~/Developer/funding-portal` (faucet branch)
- xmtp.chat: `/tmp/xmtp-js/apps/xmtp.chat`
- XMTP Docs: https://docs.xmtp.org/fund-agents-apps
- Gateway Service: https://docs.xmtp.org/fund-agents-apps/run-gateway
- Browser SDK: https://github.com/xmtp/xmtp-js/tree/main/packages/browser-sdk
- Shadcn MCP: Available via tool
