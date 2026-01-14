# fn-1.10 Group Chat Support

## Description

Implement group chat creation and messaging.

### Components to Create

1. **NewGroupDialog** - Create group with name and members
2. **GroupMemberInput** - Add members by address/ENS
3. **GroupThread** - Display group messages
4. **GroupInfo** - Show group members, name

### Creating Groups

```typescript
// Create new group
const group = await client.conversations.newGroup(
  memberInboxIds,  // Array of inbox IDs
  {
    name: groupName,
    description: '',
    imageUrl: '',
  }
);

// Send message to group
await group.send(messageText);
```

### Member Resolution

1. User enters addresses/ENS names
2. Resolve ENS to addresses
3. Get inbox IDs from addresses: `client.inboxIdFromAddress(address)`
4. Check each member's reachability

### Group Features

- Name the group
- Add multiple members (2-10)
- All members must be XMTP-reachable
- Show member list in group info
- Group messages show sender name

### Cost Considerations

- Group messages cost per recipient (multiplier)
- Show aggregate cost in UI
- TODO: Confirm exact group cost formula

### Reference

- XMTP SDK group chat docs
- `/tmp/xmtp-js/apps/xmtp.chat/` for patterns
## Acceptance

- [ ] Can create group with custom name
- [ ] Can add multiple members by address/ENS
- [ ] Shows reachability for each member
- [ ] Group appears in conversation list
- [ ] Can send messages to group
- [ ] Messages show sender identity
- [ ] Group persists across refresh
- [ ] Can view group member list
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
