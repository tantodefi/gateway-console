# fn-1.2 Wallet Connection Component

## Description

Implement wallet connection UI using wagmi and WalletConnect.

### Components to Create

1. **ConnectWallet** - Button that opens wallet modal
2. **WalletStatus** - Shows connected address, network, disconnect option
3. **NetworkSwitcher** - Prompts to switch to Base Sepolia if wrong network

### Implementation

- Use wagmi's `useConnect`, `useAccount`, `useDisconnect` hooks
- Support MetaMask (injected) and WalletConnect
- Auto-reconnect on page refresh (wagmi's built-in persistence)
- Show truncated address (0x1234...5678)

### Reference Pattern

```typescript
// From funding portal: src/components/providers/WagmiProviders.tsx
const config = createConfig({
  chains: [settlementChain],
  connectors: [injected(), walletConnect({ projectId })],
  transports: { [settlementChain.id]: http() },
});
```

### UI Requirements

- Prominent "Connect Wallet" button when disconnected
- Show wallet address and "Disconnect" when connected
- Network badge showing "Base Sepolia"
## Acceptance

- [ ] Can connect MetaMask wallet
- [ ] Can connect via WalletConnect
- [ ] Shows connected wallet address (truncated)
- [ ] Shows network name (Base Sepolia)
- [ ] Can disconnect wallet
- [ ] Connection persists on page refresh
- [ ] Prompts to switch network if not on Base Sepolia
## Done summary
Implemented wallet connection UI using wagmi v2.

Key accomplishments:
- Created WalletProvider with wagmi and react-query setup
- Created ConnectWallet component for MetaMask and WalletConnect
- Created WalletStatus showing address, network, and disconnect
- Created WalletButton that switches between connect/status states
- Network switching prompts to Base Sepolia if wrong network
- Updated App.tsx and main.tsx to use wallet components
## Evidence
- Commits:
- Tests:
- PRs: