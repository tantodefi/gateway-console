import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useBalance } from 'wagmi'
import { GATEWAY_PAYER_ADDRESS, XMTP_CHAIN_ID } from '@/lib/constants'
import { calculateOperationsAvailable } from '@/lib/gasCosting'

/**
 * Shared store for optimistic deposit state.
 * This needs to be shared across all hook instances so that when
 * DepositDialog adds an optimistic deposit, BalanceDisplay sees it immediately.
 *
 * We track both the optimistic amount AND the expected total balance so we know
 * when the chain has caught up and we can clear the optimistic state.
 */
let optimisticAmount = 0n
let expectedTotalBalance = 0n  // chainBalance + optimisticAmount at time of deposit
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getOptimisticAmount() {
  return optimisticAmount
}

function getExpectedTotalBalance() {
  return expectedTotalBalance
}

function addOptimisticAmount(amount: bigint, currentChainBalance: bigint) {
  optimisticAmount = optimisticAmount + amount
  expectedTotalBalance = currentChainBalance + optimisticAmount
  listeners.forEach((listener) => listener())
}

function clearOptimisticAmount() {
  if (optimisticAmount !== 0n) {
    optimisticAmount = 0n
    expectedTotalBalance = 0n
    listeners.forEach((listener) => listener())
  }
}

/**
 * Hook to fetch and calculate the gas reserve balance on XMTP Appchain
 *
 * The gas reserve is the native xUSD balance on the XMTP Appchain (L3).
 * It's used to pay for on-chain operations like group membership changes
 * and identity updates.
 *
 * Supports optimistic updates - call addOptimisticDeposit() after a deposit
 * to immediately reflect the expected balance before the bridge completes.
 */
export function useGasReserveBalance() {
  // Subscribe to shared optimistic amount store
  const currentOptimisticAmount = useSyncExternalStore(subscribe, getOptimisticAmount)
  const currentExpectedTotal = useSyncExternalStore(subscribe, getExpectedTotalBalance)

  // Query native xUSD balance on XMTP Appchain
  // xUSD is the native token (like ETH on mainnet), so we don't specify a token address
  const {
    data: balanceData,
    isLoading,
    error,
    refetch,
  } = useBalance({
    address: GATEWAY_PAYER_ADDRESS,
    chainId: XMTP_CHAIN_ID,
    query: {
      enabled: !!GATEWAY_PAYER_ADDRESS,
      refetchInterval: 30_000, // Refetch every 30 seconds
    },
  })

  // Extract balance value (in 18 decimals - native xUSD on appchain)
  const chainBalance = balanceData?.value ?? 0n

  // Debug logging
  console.log('[GasReserve] Balance query:', {
    address: GATEWAY_PAYER_ADDRESS,
    chainId: XMTP_CHAIN_ID,
    balanceData,
    chainBalance: chainBalance.toString(),
    isLoading,
    error: error?.message,
  })

  // Clear optimistic amount when chain balance catches up to expected total
  useEffect(() => {
    if (currentOptimisticAmount > 0n && chainBalance >= currentExpectedTotal) {
      clearOptimisticAmount()
    }
  }, [chainBalance, currentOptimisticAmount, currentExpectedTotal])

  // Add optimistic deposit amount (called after successful deposit tx)
  const addOptimisticDeposit = useCallback((amount: bigint) => {
    addOptimisticAmount(amount, chainBalance)
  }, [chainBalance])

  // Effective balance includes optimistic deposits
  const balance = chainBalance + currentOptimisticAmount

  // Calculate operations available based on effective balance
  const calculation = calculateOperationsAvailable(balance)

  return {
    // Raw balance from chain
    rawBalance: balanceData,
    // Balance in xUSD (18 decimals) - includes optimistic deposits
    balance,
    // Chain balance without optimistic updates
    chainBalance,
    // Whether we have pending optimistic updates
    hasPendingDeposit: currentOptimisticAmount > 0n,
    // Calculation results
    operationsAvailable: calculation.operationsAvailable,
    formattedOperations: calculation.formattedOperations,
    formattedBalance: calculation.formattedBalance,
    balanceDollars: calculation.balanceDollars,
    // Warning level
    warningLevel: calculation.warningLevel,
    isLowBalance: calculation.warningLevel !== 'none',
    // Loading state
    isLoading,
    error,
    refetch,
    // Optimistic update
    addOptimisticDeposit,
  }
}
