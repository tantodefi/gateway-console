# Message With Tokens

A demo web app that teaches developers how XMTP messaging fees work by letting them experience the system firsthand.

## Quick Start

### Prerequisites

- Node.js 20.19+ or 22.12+
- Docker (for running the XMTP Gateway)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
```

Generate a payer private key for local development:

```bash
# Using cast (from foundry)
cast wallet new

# Or use any Ethereum wallet generator
```

Edit `.env.local` and set:
- `XMTPD_PAYER_PRIVATE_KEY` - Your generated private key
- `VITE_GATEWAY_PAYER_ADDRESS` - The address derived from your private key
- `XMTPD_SETTLEMENT_CHAIN_RPC_URL` / `XMTPD_SETTLEMENT_CHAIN_WSS_URL` - Base Sepolia RPC (get from Alchemy)

### 3. Clone and start the Gateway

First, clone the gateway service:

```bash
git clone https://github.com/xmtp/gateway-service-example.git gateway-service
```

Then start the gateway (builds on first run):

```bash
docker-compose up -d
```

This runs the XMTP Gateway on `http://localhost:5050` (proxied from port 5872).

### 4. Start the frontend

```bash
npm run dev
```

Open http://localhost:5173 to see the app.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Local Dev                             │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │   Frontend (Vite)    │    │   Gateway Service          │ │
│  │   localhost:5173     │───▶│   localhost:5050           │ │
│  │                      │    │   (Docker)                 │ │
│  └──────────────────────┘    └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Direct messaging** - Send 1:1 messages between users
- **Group messaging** - Create and manage group conversations
- **Test users** - Generate ephemeral users or use connected wallet
- **Fee visualization** - See real-time cost per message
- **Balance tracking** - Monitor payer balance and available messages
- **Testnet faucet** - Mint mUSD for testing
- **ENS resolution** - Display ENS names for addresses
- **Mobile responsive** - Full mobile support with optimized UI

## Tech Stack

- **React 19** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** + shadcn/ui - Styling
- **XMTP Browser SDK** - Messaging protocol
- **wagmi** + viem - Ethereum interactions
- **TanStack Query** - Data fetching

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run typecheck` | Type check TypeScript |
| `npm run lint` | Run ESLint |
| `docker-compose up -d` | Start gateway in background |
| `docker-compose down` | Stop gateway |
| `docker-compose logs -f` | View gateway logs |

## Environment Variables

See `.env.example` for all available environment variables.

### Frontend (Vite)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GATEWAY_PAYER_ADDRESS` | Yes | Address that pays for messages |
| `VITE_APP_NAME` | No | App name displayed in header |
| `VITE_CONTRACTS_ENVIRONMENT` | No | XMTP environment (testnet-staging, testnet, mainnet) |
| `VITE_GATEWAY_URL` | No | Gateway URL (default: localhost:5050) |
| `VITE_SETTLEMENT_CHAIN_RPC_URL` | No | Base Sepolia RPC (default: public RPC) |
| `VITE_MAINNET_RPC_URL` | No | Mainnet RPC for ENS (default: public RPC) |
| `VITE_WALLETCONNECT_PROJECT_ID` | No | WalletConnect project ID |

### Gateway (Docker)

| Variable | Description |
|----------|-------------|
| `XMTPD_CONTRACTS_ENVIRONMENT` | XMTP environment |
| `XMTPD_PAYER_PRIVATE_KEY` | Private key for payer wallet |
| `XMTPD_APP_CHAIN_RPC_URL` | XMTP App Chain RPC |
| `XMTPD_APP_CHAIN_WSS_URL` | XMTP App Chain WebSocket |
| `XMTPD_SETTLEMENT_CHAIN_RPC_URL` | Base Sepolia RPC |
| `XMTPD_SETTLEMENT_CHAIN_WSS_URL` | Base Sepolia WebSocket |

## How Messaging Fees Work

1. **Apps pay, not users** - The gateway's payer wallet pays for all messages
2. **Deposit to fund** - Deposit mUSD to the payer's balance in PayerRegistry
3. **Per-message costs** - Each message costs based on payload size
4. **Shared balance** - Multiple users can send from the same payer balance

Fee formula:
```
cost = (messageFee + storageFee × bytes × days) × gasOverhead
```

Current testnet values:
- Base fee: ~$0.0000385 per message
- Storage: 22 picodollars per byte per day
- Default retention: 60 days
- Gas overhead: 1.25x

## Production Deployment (Railway)

Deploy this app to Railway for production use.

### Prerequisites

- Railway account (https://railway.app)
- GitHub repository connected to Railway
- WalletConnect project ID

### Deploy Frontend

1. Create a new Railway project
2. Click "New Service" → "GitHub Repo"
3. Select this repository
4. Railway will auto-detect the `railway.toml` config

Set these environment variables:
```bash
VITE_GATEWAY_URL=https://<gateway-service>.railway.internal:5050
VITE_SETTLEMENT_CHAIN_RPC_URL=https://sepolia.base.org
VITE_APP_CHAIN_RPC_URL=https://xmtp-testnet.g.alchemy.com/public
VITE_MAINNET_RPC_URL=https://eth.llamarpc.com
VITE_WALLETCONNECT_PROJECT_ID=<your-project-id>
VITE_GATEWAY_PAYER_ADDRESS=<your-payer-address>
```

### Deploy Gateway

1. In the same Railway project, click "New Service" → "Docker Image"
2. Enter: `xmtp/xmtpd-gateway:main`
3. Set port to `5050`
4. Enable internal networking

Set these environment variables:
```bash
XMTPD_PAYER_PRIVATE_KEY=<your-payer-private-key>
```

### Fund the Production Payer

1. Copy your payer address (derived from the private key)
2. Get testnet ETH from a faucet (for gas)
3. Use the app's Faucet feature to mint mUSD
4. Deposit mUSD to fund messaging

### Railway Files

- `railway.toml` - Frontend deployment config
- `docker-compose.yml` - Local development only

### Internal Networking

Railway provides internal networking between services. Use the internal URL for the gateway:
- Internal: `https://<gateway-service>.railway.internal:5050`
- Public (if exposed): `https://<gateway-service>.up.railway.app`
