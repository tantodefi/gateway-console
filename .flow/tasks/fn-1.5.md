# fn-1.5 Balance Display & Messages Available

## Description

Display payer balance and calculate "messages available" based on current rates.

### Components to Create

1. **BalanceDisplay** - Shows payer balance in USD
2. **MessagesAvailable** - Shows estimated message count

### Implementation

```typescript
// Query payer balance from PayerRegistry
const { data: balance } = useReadPayerRegistryBalance({
  address: PAYER_REGISTRY,
  args: [payerAddress],
});

// Get rates from RateRegistry
const { rates } = useRateRegistry();

// Calculate messages available
const costPerMessage = calculateCostPerMessageFromRates(rates);
const messagesAvailable = balance / costPerMessage;
```

### Cost Calculation

From `messageCosting.ts`:
```typescript
cost = (messageFee + storageFee * bytes * days + congestionFee) * gasOverhead

// Defaults: 1024 bytes, 60 days, 1.25x overhead
// ~$0.00005 per message at current rates
```

### UI

- Prominent display: "~20,000 messages available"
- Smaller: "$1.00 balance"
- Warning state when < 100 messages remaining
- "Add Funds" prompt when low

### Reference

- `~/Developer/funding-portal/src/components/ui/balance/BalanceCard.tsx`
- `~/Developer/funding-portal/src/utils/messageCosting.ts`
- `~/Developer/funding-portal/src/hooks/contracts/useRateRegistry.ts`
## Acceptance

- [ ] Shows payer balance in USD format
- [ ] Shows estimated messages available
- [ ] Updates after deposit transaction confirms
- [ ] Fetches rates from RateRegistry on-chain
- [ ] Shows warning when balance is low
- [ ] Calculation matches funding portal logic
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
