# fn-1.7 XMTP Client Lifecycle

## Description

Manage XMTP client lifecycle - create clients per user, handle switching, connect to gateway.

### Context

```typescript
interface XMTPContextValue {
  client: Client | null;
  activeUserId: string | null;
  initializeClient: (user: EphemeralUser) => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: Error | null;
}
```

### Implementation

```typescript
// Create signer from ephemeral user (from xmtp.chat)
const createEphemeralSigner = (privateKey: Hex): Signer => {
  const account = privateKeyToAccount(privateKey);
  return {
    type: 'EOA',
    getIdentifier: () => ({
      identifier: account.address.toLowerCase(),
      identifierKind: 'Ethereum',
    }),
    signMessage: async (message: string) => {
      const signature = await account.signMessage({ message });
      return toBytes(signature);
    },
  };
};

// Initialize client with gateway
const client = await Client.create(signer, {
  env: 'dev',  // testnet
  apiUrl: import.meta.env.VITE_GATEWAY_URL,
  dbPath: `xmtp-${user.id}`,  // Separate DB per user
});
```

### User Switching

1. Close current client if exists
2. Create new client for selected user
3. Sync conversations
4. Update context

### OPFS Considerations

- Each user needs separate `dbPath` to avoid conflicts
- Must close client before switching (OPFS single-connection limit)
- Handle errors if OPFS not supported

### Reference

- `/tmp/xmtp-js/apps/xmtp.chat/src/contexts/XMTPContext.tsx`
- `/tmp/xmtp-js/apps/xmtp.chat/src/helpers/createSigner.ts`
## Acceptance

- [ ] Can initialize XMTP client for a user
- [ ] Client connects to gateway URL from env
- [ ] Can switch between users (closes old client, opens new)
- [ ] Each user has separate OPFS database
- [ ] Shows loading state during client initialization
- [ ] Handles connection errors gracefully
- [ ] Client persists conversations across sessions
## Done summary
Created XMTP client lifecycle management with per-user OPFS isolation.

Key accomplishments:
- Created createEphemeralSigner utility for XMTP from private keys
- Created XMTPContext with client lifecycle management
- Implemented per-user OPFS database isolation using user UUID
- Added XMTPStatus component showing connection state
- Integrated user selection with XMTP client initialization
- Client auto-connects when user is selected, disconnects when deselected
## Evidence
- Commits:
- Tests:
- PRs: