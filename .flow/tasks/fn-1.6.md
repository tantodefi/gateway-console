# fn-1.6 User Management (Ephemeral Keys)

## Description

Implement ephemeral user management with browser-generated keys stored in localStorage.

### Components to Create

1. **UserList** - Sidebar showing all users
2. **AddUserDialog** - Modal to create new user with name
3. **UserCard** - Individual user display with select/delete

### Data Model

```typescript
interface EphemeralUser {
  id: string;           // Random UUID (crypto.randomUUID()) - MUST be random, not derived from name
  name: string;         // Display name (e.g., "Alice")
  privateKey: Hex;      // secp256k1 private key
  address: string;      // Derived Ethereum address
  createdAt: number;    // Timestamp
}

// IMPORTANT: user.id must be a random UUID to ensure OPFS isolation
// If derived from name, deleting "Alice" and recreating "Alice" would collide
```

### Implementation

```typescript
// Generate new user (from xmtp.chat pattern)
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const createUser = (name: string): EphemeralUser => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    id: crypto.randomUUID(),
    name,
    privateKey,
    address: account.address,
    createdAt: Date.now(),
  };
};

// Persist with @mantine/hooks
const [users, setUsers] = useLocalStorage<EphemeralUser[]>({
  key: 'MWT_USERS',
  defaultValue: [],
});
```

### UI Requirements

- List users in sidebar with avatars (generated from address)
- Highlight currently selected user
- "Add User" button opens dialog
- Delete user with confirmation
- Show address truncated under name

### Reference

- `/tmp/xmtp-js/apps/xmtp.chat/src/hooks/useEphemeralSigner.ts`
- `/tmp/xmtp-js/apps/xmtp.chat/src/hooks/useSettings.ts`
## Acceptance

- [ ] Can create new user with custom name
- [ ] Users persist in localStorage across refresh
- [ ] Can view list of all users
- [ ] Can select a user to make active
- [ ] Can delete a user with confirmation
- [ ] Shows user address (truncated)
- [ ] Generates unique avatar per user
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
