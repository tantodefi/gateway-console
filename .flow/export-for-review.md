# Plan Review Request: Message With Tokens (fn-1) - REVISED

## Summary of Changes from First Review

1. **Payer-Gateway Relationship Clarified** - Gateway has pre-configured payer key; developers deposit TO the gateway's payer address
2. **Fee Formula Already Documented** - Formula was in spec (confirmed present)
3. **Task Sequencing Fixed** - Split fn-1.11 into Local Gateway (fn-1.11) + Railway Deployment (fn-1.12)
4. **Dependencies Corrected** - fn-1.7 now depends on fn-1.11; fn-1.9 now depends on fn-1.8

---

# Epic: Message With Tokens - XMTP Fee Demo App

## Overview

A demo web app that teaches developers how XMTP messaging fees work by letting them experience the system firsthand. The user plays the role of a developer: they connect a wallet, fund a payer balance, create multiple "users" (ephemeral identities), and send messages - all while seeing real-time cost breakdowns.

**Key educational goals:**
- Demonstrate that apps pay for messaging, not end users
- Show how multiple identities can share a single payer balance
- Display actual message costs based on payload size
- Illustrate the funding flow: mUSD faucet → deposit → send

## Payer-Gateway Relationship (CRITICAL)

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

## Fee Calculation Formula

```typescript
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

## Scope

### In Scope (v1)
- Developer wallet connection (MetaMask, WalletConnect)
- mUSD faucet minting (testnet only)
- Permit-based deposit to PayerRegistry (2 confirmations + 1 signature)
- Multiple ephemeral "users" (browser-generated EOA keys, localStorage)
- DM messaging to hi.xmtp.eth, custom addresses/ENS, between local users
- Group chat creation and messaging
- Real-time message cost display (based on actual payload bytes)
- "Messages available" balance counter
- Message history persistence (XMTP OPFS database)
- ENS resolution and reachability checking
- Railway deployment (frontend + gateway sidecar)

### Out of Scope
- Mainnet USDC onramp/swap
- Withdrawal flow from PayerRegistry
- Real passkey/WebAuthn support
- Read receipts, typing indicators, media attachments

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
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Base Sepolia │  │ XMTP Testnet │  │ Ethereum Mainnet │   │
│  │ (mUSD, Payer │  │ (Messaging)  │  │ (ENS Resolution) │   │
│  │  Registry)   │  │              │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite |
| UI | Shadcn/ui |
| Wallet | wagmi v2 + viem |
| Messaging | @xmtp/browser-sdk |
| State | React Context + @mantine/hooks |
| Gateway | Docker: xmtp/xmtpd-gateway:main |
| Deployment | Railway |
| Networks | XMTP testnet-staging, Base Sepolia |

## Task Breakdown (12 Tasks)

### fn-1.1: Project Setup & Configuration
**Depends on**: None

Initialize React + Vite project with all dependencies.

**Acceptance**: `npm run dev` works, TypeScript compiles, Shadcn button renders

---

### fn-1.11: Local Gateway Docker Setup ⚡ MOVED EARLY
**Depends on**: fn-1.1

Set up local Gateway Service for development. **Required early to unblock XMTP testing.**

**Acceptance**: Gateway runs locally, docker-compose.yml works, payer address derivation utility created

---

### fn-1.2: Wallet Connection Component
**Depends on**: fn-1.1

Implement wallet connection with wagmi.

**Acceptance**: Can connect/disconnect wallet, persists on refresh

---

### fn-1.6: User Management (Ephemeral Keys)
**Depends on**: fn-1.1

Manage browser-generated identities.

**Acceptance**: Create named users, persist on refresh, switch between them

---

### fn-1.7: XMTP Client Lifecycle
**Depends on**: fn-1.6, fn-1.11 ⚡ FIXED

Initialize XMTP clients per user.

**Acceptance**: Client connects to gateway, conversations persist, switching works

---

### fn-1.3: Faucet Integration (mUSD Minting)
**Depends on**: fn-1.2

Port faucet from funding portal.

**Acceptance**: Can mint 1000 mUSD, rate limited, balance updates

---

### fn-1.4: Deposit Flow with Permit Signature
**Depends on**: fn-1.3

Implement gasless deposit to gateway's payer address.

**Acceptance**: Deposit with 1 signature + 1 tx, payer balance updates

---

### fn-1.5: Balance Display & Messages Available
**Depends on**: fn-1.4

Query and display balance.

**Acceptance**: Shows balance in USD and message count, updates after deposit

---

### fn-1.8: DM Messaging & ENS Resolution
**Depends on**: fn-1.7, fn-1.5

Implement direct messaging.

**Acceptance**: Send to hi.xmtp.eth, resolve ENS, show reachability

---

### fn-1.9: Message Cost Display
**Depends on**: fn-1.5, fn-1.8 ⚡ FIXED

Show per-message costs.

**Acceptance**: Cost shown before/after send, longer messages cost more

---

### fn-1.10: Group Chat Support
**Depends on**: fn-1.8

Implement group messaging.

**Acceptance**: Create group, add members, send messages, shows senders

---

### fn-1.12: Railway Deployment ⚡ NEW
**Depends on**: fn-1.10

Deploy frontend and gateway to Railway.

**Acceptance**: Both services deployed, internal networking works, production URL accessible

---

## Revised Dependency Graph

```
fn-1.1 (Setup)
  │
  ├── fn-1.11 (Local Gateway) ──────────────────────────┐
  │                                                      │
  ├── fn-1.2 (Wallet) → fn-1.3 (Faucet) → fn-1.4 (Deposit) → fn-1.5 (Balance)
  │                                                              │
  │                                                              ├── fn-1.9 (Cost) ←── fn-1.8
  │                                                              │                        ↑
  ├── fn-1.6 (Users) → fn-1.7 (XMTP Client) ─────────────────────┼── fn-1.8 (DM) → fn-1.10 (Groups)
  │                           ↑                                                           │
  │                           └───── depends on fn-1.11 ──────────────────────────────────┤
  │                                                                                       │
  └── fn-1.12 (Railway Deploy) ←────────────────────────────────────────────── fn-1.10 ──┘
```

**Recommended execution order:**
1. fn-1.1 (Setup)
2. fn-1.11 (Local Gateway) ← Early to unblock XMTP testing
3. fn-1.2 (Wallet)
4. fn-1.6 (Users)
5. fn-1.7 (XMTP Client) ← Now testable with local gateway
6. fn-1.3 (Faucet)
7. fn-1.4 (Deposit)
8. fn-1.5 (Balance)
9. fn-1.8 (DM Messaging)
10. fn-1.9 (Cost Display)
11. fn-1.10 (Groups)
12. fn-1.12 (Railway)

## Key Technical Decisions

1. **Ephemeral EOA keys** instead of passkeys (simpler, passkey support coming later)
2. **Permit-based deposits** to reduce confirmations (2 instead of 3)
3. **Separate OPFS per user** using `dbPath: xmtp-${user.id}` to avoid conflicts
4. **Railway for both services** (simpler than split deployment)
5. **@mantine/hooks for persistence** (consistent with xmtp.chat)
6. **Gateway payer is deposit target** (teaches real-world app operator model)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Gateway :main tag instability | Pin to specific SHA if issues |
| OPFS browser support | Feature detect, show error |
| ENS resolution latency | Cache resolved addresses |
| Testnet data loss | Document ephemeral nature |
| EIP-2612 permit complexity | Reference funding portal implementation |

## Reviewer Notes

### Issues Fixed from First Review

1. ✅ **Payer-gateway relationship** - Now explicitly documented: developers deposit to gateway's payer address
2. ✅ **Fee formula** - Was already in spec, confirmed present
3. ✅ **Task sequencing** - Split fn-1.11, moved local gateway early, fixed dependencies

### Remaining Considerations (Non-blocking)

- **Testing strategy**: Consider adding in implementation phase
- **Error states**: Basic error handling in acceptance criteria
- **Groups/ENS deferral**: Kept in v1 per user request, but could simplify if needed

---

**Please provide your verdict: SHIP, NEEDS_WORK, or MAJOR_RETHINK**
