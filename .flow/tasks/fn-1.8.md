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
# fn-1.8: DM Messaging & ENS Resolution

Implemented DM messaging with ENS resolution and reachability checking.

## Files Created
- `src/lib/ens.ts` - ENS resolution utility for address/ENS name resolution
- `src/hooks/useConversations.ts` - Hooks for conversations, messages, and sending
- `src/contexts/MessagingContext.tsx` - Context for managing selected conversation state
- `src/components/messaging/ConversationList.tsx` - List of existing DM conversations
- `src/components/messaging/MessageThread.tsx` - Display messages in a conversation
- `src/components/messaging/MessageInput.tsx` - Compose and send messages
- `src/components/messaging/NewConversationDialog.tsx` - Create new conversation with ENS/address
- `src/components/messaging/index.ts` - Component exports

## Files Updated
- `src/contexts/index.ts` - Export MessagingProvider
- `src/main.tsx` - Add MessagingProvider
- `src/App.tsx` - Integrate messaging UI with conversation sidebar

## Features
- Resolve ENS names to Ethereum addresses via mainnet
- Check XMTP reachability before starting conversation
- Create DM conversations with inbox ID lookup
- Send and receive text messages with streaming
- Conversation list sorted by last message
- Message thread with auto-scroll
- New conversation dialog with demo address (hi.xmtp.eth)
## Evidence
- Commits:
- Tests:
- PRs: