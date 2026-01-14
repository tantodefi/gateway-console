# fn-1.8 DM Messaging & ENS Resolution

## Description

Implement DM messaging with ENS resolution and reachability checking.

### Components to Create

1. **ConversationList** - List of existing conversations
2. **NewConversationDialog** - Enter recipient address/ENS
3. **MessageThread** - Display messages in a conversation
4. **MessageInput** - Compose and send messages
5. **RecipientInput** - Address/ENS input with validation

### ENS Resolution

```typescript
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';

const resolveENS = async (name: string): Promise<Address | null> => {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(import.meta.env.VITE_MAINNET_RPC_URL),
  });
  return client.getEnsAddress({ name: normalize(name) });
};
```

### Reachability Check

```typescript
// Check if recipient can receive XMTP messages
const canMessage = await client.canMessage(recipientAddress);
if (!canMessage) {
  // Show "This address is not on XMTP"
}
```

### Sending Messages

```typescript
// Find or create conversation
const conversation = await client.conversations.newConversation(recipientInboxId);
await conversation.send(messageText);
```

### Demo Recipients

- `hi.xmtp.eth` - Pre-configured demo address
- Custom address/ENS input
- Other local users (from UserList)

### Reference

- `/tmp/xmtp-js/apps/xmtp.chat/src/components/Messages/`
## Acceptance

- [ ] Can enter recipient as Ethereum address
- [ ] Can enter recipient as ENS name (resolves to address)
- [ ] Shows reachability status ("On XMTP" / "Not on XMTP")
- [ ] Can send DM to hi.xmtp.eth
- [ ] Can send DM to other local users
- [ ] Messages appear in conversation thread
- [ ] Conversation list shows all conversations
- [ ] Messages persist across page refresh
- [ ] Shows error for invalid addresses
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
