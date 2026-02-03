# XMTP Gateway Console

Learn how XMTP messaging fees work by using them.

## What It Does

A deployable messaging app that makes costs visible. Use the hosted version to understand XMTP's fee model, or deploy your own to validate your gateway payment setup—all with testnet tokens.

**New: Yield-Funded Messaging** — Deposit USDC or ETH into Aave V3 to earn yield, then harvest the interest to fund XMTP messaging. This unlocks two powerful models:

- **App-funded**: Your app deposits funds and earns yield to cover messaging costs for all users
- **User-funded**: Users deposit their own funds and use yield to pay for their own messages—messaging becomes "free" while their principal stays invested

## When to Use It

- Understanding XMTP's fee model
- Testing your gateway payment setup before integrating into your app
- Experimenting with user-funded messaging via DeFi yield

## Why Use It

XMTP's default model is "apps pay"—your app covers messaging costs so users don't have to. But with yield-funded messaging, you can also enable **users to pay their own way** by depositing into DeFi and using earned interest for fees.

This console shows you both models in practice: real messages, real fee breakdowns, and a real gateway setup you can validate before you ship.

---

## Try It Now

Visit the [live demo](https://xmtp-gateway-console.up.railway.app/)—no setup required.

The hosted version connects directly to the XMTP v3 dev network. You can:
1. Mint testnet tokens using the Faucet
2. Deposit funds to the gateway's payer balance
3. Create test users and send messages
4. See fee calculations and balance updates in real-time

---

## Setup

Run your own instance to validate your gateway payment setup before integrating into your app.

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Local Dev                               │
│  ┌──────────────────────┐      ┌────────────────────────────┐  │
│  │   Frontend (Vite)    │      │   Gateway Service          │  │
│  │   localhost:5173     │─────▶│   localhost:5050           │  │
│  │   XMTP Client        │      │   (Docker)                 │  │
│  └──────────────────────┘      └────────────────────────────┘  │
│           │                               │                     │
│           │                               ▼                     │
│           │                   ┌────────────────────────────┐   │
│           │                   │   Payer Registry           │   │
│           │                   │   (Base Sepolia)           │   │
│           │                   └────────────────────────────┘   │
│           │                               ▲                     │
│           ▼                               │                     │
│  ┌──────────────────────┐                 │                     │
│  │   Aave V3 Pool       │─── harvest ─────┘                     │
│  │   (Base Sepolia)     │   (yield → mUSD → deposit)            │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

- **Frontend** – This React app. It includes the XMTP client that sends messages through your gateway.
- **Gateway** – A service you run that holds your payer wallet's private key and signs payment transactions on every message.
- **Payer Wallet** – An Ethereum wallet that pays for messages. In "app pays" mode, this is your app's wallet. In "user pays" mode, each user has their own payer balance.
- **Payer Registry** – A smart contract on Base Sepolia that holds payer balances. The gateway draws from the appropriate payer with each message sent.
- **Aave V3 Pool** – DeFi lending protocol where funds earn yield. Harvested interest is converted to mUSD and deposited to the Payer Registry.

When you deploy locally, you run the Frontend and Gateway. The Payer Registry already exists on-chain—you just fund it.

### Prerequisites

- Node.js 20.19+ or 22.12+
- Docker (for running the Gateway)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Generate a payer wallet:

```bash
# Using cast (from Foundry)
cast wallet new

# Or use any Ethereum wallet generator
```

Edit `.env.local`:

| Variable | Value |
|----------|-------|
| `XMTPD_PAYER_PRIVATE_KEY` | Your generated private key |
| `VITE_GATEWAY_PAYER_ADDRESS` | The address derived from your private key |
| `XMTPD_SETTLEMENT_CHAIN_RPC_URL` | Base Sepolia RPC URL ([get from Alchemy](https://www.alchemy.com/)) |
| `XMTPD_SETTLEMENT_CHAIN_WSS_URL` | Base Sepolia WebSocket URL |

### 3. Start the Gateway

```bash
git clone https://github.com/xmtp/gateway-service-example.git gateway-service
docker-compose up -d
```

The Gateway runs on `http://localhost:5050`.

### 4. Start the Frontend

```bash
npm run dev
```

Open http://localhost:5173.

### 5. Fund your payer

Before sending messages, fund your payer wallet:

1. Use the **Faucet** to mint testnet mUSD
2. Use **Deposit** to add funds to your payer balance in the Payer Registry

---

## Usage

### Send Your First Message

1. **Create a test user** – Click "Add User" to generate an ephemeral wallet, or connect your own wallet.

2. **Fund the payer** – Before sending, your gateway needs funds. Choose one method:
   - **Direct deposit**: Click **Faucet** to mint testnet mUSD, then **Deposit** to add funds
   - **Yield-funded**: Deposit to Aave to earn yield, then harvest interest to fund messages (see [Yield Deposits](#yield-deposits))

3. **Start a conversation** – Click "New Conversation" and enter another user's address. You can create a second test user to message yourself.

4. **Send a message** – Type and send. Watch the cost display update as you type, then see the fee deducted after sending.

5. **Check the balance** – The header shows your remaining payer balance and estimated messages remaining.

### Fee Breakdown

As you type, the console calculates message cost using XMTP's fee formula:

```
cost = (messageFee + storageFee × bytes × days) × gasOverhead
```

| Component | Current Testnet Value |
|-----------|----------------------|
| Base message fee | ~$0.0000385 |
| Storage fee | 22 picodollars/byte/day |
| Default retention | 60 days |
| Gas overhead | 1.25× |

Longer messages cost more (more bytes to store). The cost display updates in real-time as your message length changes.

### Dual Fee Model

XMTP uses two types of fees, each paid from a separate balance:

**Message Fees (Payer Registry)**

Paid from your mUSD balance on Base Sepolia. These cover:
- Sending messages
- Message storage (bytes × days × rate)

**Gas Fees (XMTP Appchain)**

Paid from your xUSD gas reserve on the XMTP Appchain (L3). These cover:
- Creating groups
- Adding/removing group members
- Updating group metadata
- Linking/unlinking wallets to identity

When you deposit funds, they're automatically split: 75% goes to your messaging balance, 25% to your gas reserve. Both balances are displayed in the sidebar with operation estimates.

The deposit preview shows exactly how your funds will be allocated before you confirm.

---

## Yield Deposits

Earn yield on your funds while funding XMTP messaging—without spending your principal. Deposit USDC or ETH into Aave V3 on Base Sepolia, earn yield, and harvest the interest to pay for messages.

**This unlocks a new paradigm for messaging costs:**

- **For Apps**: Deposit treasury funds, earn yield, and use it to subsidize messaging for all your users. Your capital works for you instead of just sitting in a payer wallet.
- **For Users**: Deposit personal funds and let the yield cover your messaging fees. Messaging becomes effectively "free" while your principal stays invested and growing.

### How It Works

```
┌─────────────────┐    deposit     ┌─────────────────┐
│  USDC/ETH/WETH  │ ─────────────▶ │  Aave V3 Pool   │
│  (your wallet)  │                │  (Base Sepolia) │
└─────────────────┘                └────────┬────────┘
                                            │ accrues yield
                                            ▼
┌─────────────────┐    harvest     ┌─────────────────┐
│  Payer Registry │ ◀───────────── │  aUSDC/aWETH    │
│  (mUSD balance) │   (yield only) │  (your wallet)  │
└─────────────────┘                └─────────────────┘
```

1. **Deposit** – Supply USDC, WETH, or ETH to Aave V3 (minimum $100)
2. **Earn** – Your position accrues yield over time (~3-5% APY on testnet)
3. **Harvest** – Withdraw just the yield, convert to mUSD, choose deposit destination
4. **Keep Principal** – Your original deposit stays in Aave earning more yield

### Estimated Message Capacity

Based on current XMTP fee rates (~$0.00005/message) and 3.5% APY:

| Deposit Amount | Monthly Yield | Messages/Month |
|----------------|---------------|----------------|
| $100 | $0.29 | ~5,855 |
| $250 | $0.73 | ~14,637 |
| $500 | $1.46 | ~29,275 |
| $1,000 | $2.92 | ~58,550 |
| $5,000 | $14.58 | ~292,752 |
| $10,000 | $29.17 | ~585,504 |

*These are estimates. Actual message capacity varies with APY fluctuations and message sizes.*

### Harvest Destinations

When harvesting yield, you choose where the mUSD is deposited:

| Destination | Description | Use Case |
|-------------|-------------|----------|
| **My Balance** (default) | Deposits to your own payer balance | User-funded messaging |
| **App Gateway** | Deposits to the app's shared payer | App-funded messaging for all users |

The "App Gateway" option requires `VITE_GATEWAY_PAYER_ADDRESS` to be configured. If not set, a warning will appear and the option will be disabled.

### Smart Wallet Support

If you're using a **Coinbase Smart Wallet** or other EIP-5792 compatible wallet, the harvest flow is batched into a single transaction with one signature:

| Wallet Type | Harvest Flow | Signatures Required |
|-------------|--------------|---------------------|
| EOA (MetaMask, etc.) | 3 transactions + permit | 4 |
| Smart Wallet (Coinbase) | 1 batched transaction | 1 |

The UI automatically detects your wallet type and shows the appropriate flow.

### Understanding the User-Funded Model

The yield deposit feature enables users to fund their own payer balance on-chain. However, there's an important architectural detail to understand about how those funds are consumed.

#### How XMTP Payment Signing Works

When a message is sent through an XMTP gateway:

```
┌─────────────────┐   client envelope   ┌─────────────────────┐
│   XMTP Client   │ ──────────────────▶ │   Gateway Service   │
│   (browser)     │                     │   (holds payer key) │
└─────────────────┘                     └──────────┬──────────┘
                                                   │ signs with
                                                   │ payer private key
                                                   ▼
                                        ┌─────────────────────┐
                                        │   Payer Envelope    │
                                        │   (signature ties   │
                                        │    msg to payer)    │
                                        └──────────┬──────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │   XMTP Network      │
                                        │   (charges payer    │
                                        │    who signed)      │
                                        └─────────────────────┘
```

**The payer charged is determined by WHO SIGNS the envelope, not who sent it.** The gateway signs every message with its configured `XMTPD_PAYER_PRIVATE_KEY`, so all messages consume from that payer's balance—regardless of who the sender is.

#### Implications for User-Funded Messaging

| Scenario | On-Chain Deposit | Message Payment |
|----------|------------------|-----------------|
| App-funded (default) | App deposits to app's payer balance | App's gateway signs → App pays ✅ |
| User-funded (current limitation) | User deposits to user's payer balance | App's gateway signs → **App pays** ❌ |

**The user's deposited balance is not consumed** because the gateway doesn't have access to the user's private key to sign payment envelopes on their behalf.

#### Current Workarounds

**Option 1: Dev Mode Testing (this app)**
- In dev mode (`VITE_XMTP_NETWORK=dev`), messages bypass payment signing entirely
- Users can test the on-chain deposit flow without a gateway
- Useful for validating yield mechanics, not for production

**Option 2: Users Run Their Own Gateway**
- Each user runs a personal gateway instance with their own payer key
- Their SDK connects to their own gateway
- Their messages are signed by their key → their balance is consumed
- High friction, not practical for consumer apps

**Option 3: App-Funded with User Contributions**
- Users harvest yield to the **App Gateway** destination
- Funds go to the app's shared payer balance
- App subsidizes all users' messaging from the pooled funds
- Users contribute but don't have individual control

#### Future Solutions (Not Yet Available)

The XMTP team is exploring several approaches to enable true user-funded messaging:

| Approach | Description | Status |
|----------|-------------|--------|
| **Delegated Signing** | Smart contract allows user to authorize a gateway to sign on their behalf | Not implemented |
| **Session Keys** | Temporary keys with limited permissions for payment signing | Not implemented |
| **Multi-Payer Gateway** | Gateway manages multiple payer keys (custody concerns) | Not recommended |
| **Per-User Gateway Instances** | Lightweight per-user gateway containers | Technically possible, operationally complex |

Until one of these solutions is implemented, the user-funded model works best when users contribute yield to a **shared app pool** rather than maintaining individual balances.

### Testing Yield Deposits Locally

The yield deposit feature works with `VITE_XMTP_NETWORK=dev` (the default). While messages in dev mode don't consume from your payer balance, the on-chain deposit flow works for testing.

#### 1. Get testnet assets

You need USDC or ETH on Base Sepolia to deposit into Aave:

- **Base Sepolia ETH**: [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia) or [Coinbase Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)
- **Testnet USDC**: [Aave Faucet](https://staging.aave.com/faucet/) (select Base Sepolia, mint USDC)

#### 2. Configure environment

For the default "My Balance" mode, no additional configuration is needed:

```bash
# Optional: Use dev mode (default, no gateway needed)
VITE_XMTP_NETWORK=dev
```

To enable the "App Gateway" destination option, set the app payer address:

```bash
# Required only for "App Gateway" harvest destination
VITE_GATEWAY_PAYER_ADDRESS=0x...your-app-payer-address...
```

#### 3. Run the app

```bash
npm run dev
```

#### 4. Test the yield flow

1. Connect your wallet (with testnet USDC or ETH)
2. Click **Yield Deposit** in the sidebar
3. Select an asset (USDC recommended for simpler testing)
4. Enter an amount ≥ $100 and deposit to Aave
5. Wait for some yield to accrue (or use Aave's testnet which accrues faster)
6. Click **Harvest**, choose a destination (My Balance or App Gateway)
7. Confirm the transaction(s)
8. Check your payer balance in the sidebar – it should increase

#### 5. Verify on-chain

You can verify the deposit on Base Sepolia:
- [PayerRegistry](https://sepolia.basescan.org/address/0x208E94fbC9833B58765fedC30CFF8539C6356e88) – Check your payer's balance
- [Aave V3 Pool](https://sepolia.basescan.org/address/0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27) – View your supply position

### Limitations (Testnet)

- **Mock swap**: Harvested yield is converted to mUSD via a testnet mint (1:1 rate). Production would use a real DEX.
- **Simulated APY**: Yield projections use an estimated 3.5% APY. Actual Aave testnet rates may vary.
- **No automation**: You must manually trigger harvests. Production could use Gelato/Chainlink Keepers.

---

## Deploy to Railway

Deploy your own instance to production.

### 1. Deploy the Frontend

1. Create a new Railway project
2. Click **New Service** → **GitHub Repo** and select this repository
3. Set environment variables:

```
VITE_GATEWAY_URL=https://<gateway-service>.railway.internal:5050
VITE_GATEWAY_PAYER_ADDRESS=<your-payer-address>
VITE_WALLETCONNECT_PROJECT_ID=<your-project-id>
```

### 2. Deploy the Gateway

1. In the same project, click **New Service** → **Docker Image**
2. Enter: `xmtp/xmtpd-gateway:main`
3. Set port to `5050` and enable internal networking
4. Set environment variable:

```
XMTPD_PAYER_PRIVATE_KEY=<your-payer-private-key>
```

### 3. Fund your payer

1. Get testnet ETH from a [Base Sepolia faucet](https://www.alchemy.com/faucets/base-sepolia)
2. Use the app's Faucet to mint mUSD
3. Deposit mUSD to fund messaging

---

## Experimental: Local Gateway Testing

> **Note:** Gateway integration is currently a work in progress. The demo and default configuration connect directly to the XMTP v3 dev network without routing through a gateway.

The XMTP Gateway Service allows apps to pay for user messages. While the gateway service exists and can be run locally, the SDK integration is still being finalized. Currently:

- **Default mode (`VITE_XMTP_NETWORK=dev`)**: Connects directly to XMTP dev network. Messages work, but aren't routed through your gateway.
- **Gateway mode (`VITE_XMTP_NETWORK=testnet`)**: Attempts to route through your gateway. This mode is experimental and may not work reliably yet.

### Testing the Gateway Locally

If you want to test the gateway integration locally:

#### 1. Generate TLS certificates

The XMTP SDK requires TLS when connecting through a gateway. Generate self-signed certs for local development:

```bash
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/localhost.key -out certs/localhost.crt \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

#### 2. Configure environment

In `.env.local`, set:

```bash
# Enable gateway routing (experimental)
VITE_XMTP_NETWORK=testnet

# Gateway URL with HTTPS (required for TLS)
VITE_GATEWAY_URL=https://localhost:5050
```

#### 3. Start the gateway with TLS

The `docker-compose.yml` includes an Envoy proxy configured for TLS. With certs in place:

```bash
docker-compose up -d
```

This starts:
- **Redis** on port 6777
- **Gateway service** (internal)
- **Envoy proxy** on port 5050 with TLS termination

#### 4. Trust the certificate

Since the certificate is self-signed, you'll need to either:
- Visit `https://localhost:5050` in your browser and accept the security warning
- Add the certificate to your system's trusted certificates

#### 5. Verify gateway status

The app shows gateway connectivity status in the sidebar. When properly configured, it should show "Gateway Connected".

### Known Issues

- TLS channel mismatch errors may occur if the gateway URL protocol doesn't match the node URLs
- The SDK currently infers TLS settings from the gateway URL, which can cause issues with mixed configurations
- Gateway mode requires the gateway service to successfully connect to XMTP network nodes
