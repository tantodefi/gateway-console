# fn-1.4 Deposit Flow with Permit Signature

## Description

Implement deposit flow using EIP-2612 permit for gasless approval.

### Flow

1. User enters amount to deposit
2. Sign EIP-2612 permit (gasless signature)
3. Call `DepositSplitter.depositFromUnderlyingWithPermit()`
4. Single transaction deposits to PayerRegistry

### Components to Create

1. **DepositButton** - "Deposit Funds" button
2. **DepositDialog** - Modal with amount input and flow

### Implementation

```typescript
// 1. Sign permit
const permit = await signTypedData({
  domain: { name: 'mUSD', chainId, verifyingContract: tokenAddress },
  types: { Permit: [...] },
  message: { owner, spender: depositSplitter, value, nonce, deadline },
});

// 2. Deposit with permit
writeContract({
  address: DEPOSIT_SPLITTER,
  abi: DepositSplitterAbi,
  functionName: 'depositFromUnderlyingWithPermit',
  args: [payer, amount, recipient, 0n, gasLimit, maxFeePerGas, deadline, v, r, s],
});
```

### Simplification from Funding Portal

- Only deposit to PayerRegistry (messaging), not AppChain (gas)
- AppChain amount = 0 (we don't need L3 gas for this demo)

### Reference

- `~/Developer/funding-portal/src/hooks/contracts/useFundingFlow.ts`
- `~/Developer/funding-portal/src/abi/DepositSplitter.ts`
## Acceptance

- [ ] Can enter deposit amount
- [ ] Shows mUSD balance available to deposit
- [ ] Signs permit without gas transaction
- [ ] Deposits to PayerRegistry in single transaction
- [ ] Shows transaction pending/success states
- [ ] Updates payer balance after deposit
- [ ] Handles signature rejection gracefully
- [ ] Validates amount <= available balance
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
