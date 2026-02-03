import { useCallback, useState, useEffect, useRef } from 'react'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWalletClient,
  useReadContract,
  useCallsStatus,
} from 'wagmi'
import { useWriteContracts } from 'wagmi/experimental'
import { baseSepolia } from 'wagmi/chains'
import { AaveV3PoolAbi } from '@/abi/AaveV3Pool'
import { MockUnderlyingFeeTokenAbi } from '@/abi/MockUnderlyingFeeToken'
import { DepositSplitterAbi } from '@/abi/DepositSplitter'
import { ERC20Abi } from '@/abi/ERC20'
import { generatePermitSignature } from '@/lib/permit'
import {
  AAVE_V3,
  AAVE_ASSETS,
  CONTRACTS,
  TOKENS,
  GATEWAY_PAYER_ADDRESS,
  GAS_RESERVE_CONSTANTS,
  type AaveAssetKey,
} from '@/lib/constants'
import { assetToUsd } from '@/lib/yieldCalculations'
import { useSmartWalletBatch } from './useSmartWalletBatch'

export type HarvestStep =
  | 'idle'
  | 'withdrawing'        // Step 1: Withdraw from Aave
  | 'withdraw-confirming'
  | 'minting'            // Step 2: Mint mUSD (mock swap)
  | 'mint-confirming'
  | 'signing'            // Step 3: Sign permit
  | 'depositing'         // Step 4: Deposit to gateway
  | 'deposit-confirming'
  | 'batching'           // Smart wallet: all steps in one batch
  | 'batch-confirming'
  | 'success'
  | 'error'

export interface HarvestState {
  step: HarvestStep
  asset: AaveAssetKey | null
  yieldAmount: bigint
  mUsdAmount: bigint
  error: Error | null
  txHash: `0x${string}` | undefined
  /** Whether using batched mode (smart wallet) */
  isBatchMode: boolean
  /** Where the harvested funds are deposited */
  depositRecipient: `0x${string}` | null
}

/** Deposit destination for harvested yield */
export type HarvestDestination = 'user' | 'app'

export interface HarvestResult {
  state: HarvestState
  isPending: boolean
  /** Full harvest flow: withdraw → mint mUSD → deposit to payer registry */
  harvestAndDeposit: (asset: AaveAssetKey, yieldAmount: bigint, destination?: HarvestDestination) => Promise<void>
  /** Withdraw from Aave only (no deposit) */
  withdraw: (asset: AaveAssetKey, amount: bigint) => Promise<void>
  /** Continue to next step (called after tx confirms) */
  continueFlow: () => Promise<void>
  reset: () => void
  /** Whether the wallet supports batched transactions */
  supportsBatchedCalls: boolean
  /** Human readable wallet type */
  walletTypeLabel: string
  /** Whether app payer address is configured */
  isAppPayerConfigured: boolean
}

const initialState: HarvestState = {
  step: 'idle',
  asset: null,
  yieldAmount: 0n,
  mUsdAmount: 0n,
  error: null,
  txHash: undefined,
  isBatchMode: false,
  depositRecipient: null,
}

/**
 * Hook for harvesting yield from Aave and depositing to XMTP payer registry
 *
 * Deposit destinations:
 * - 'user' (default): Deposit to connected user's payer balance
 * - 'app': Deposit to app's gateway payer (requires VITE_GATEWAY_PAYER_ADDRESS)
 *
 * Multi-step flow (EOA wallets):
 * 1. Withdraw yield from Aave (aToken → USDC/WETH)
 * 2. Mint mUSD (mock swap - 1:1 for testnet)
 * 3. Sign permit for DepositSplitter
 * 4. Deposit mUSD to PayerRegistry via DepositSplitter
 *
 * Batched flow (Smart wallets like Coinbase Smart Wallet):
 * All 4 operations in a single EIP-5792 batch with one signature
 */
export function useHarvestYield(): HarvestResult {
  const [state, setState] = useState<HarvestState>(initialState)
  const flowRef = useRef<{ asset: AaveAssetKey; yieldAmount: bigint; recipient: `0x${string}` } | null>(null)

  const { address } = useAccount()
  const { data: walletClient } = useWalletClient({ chainId: baseSepolia.id })
  const { supportsBatchedCalls, walletTypeLabel } = useSmartWalletBatch()
  
  // Check if app payer is configured
  const isAppPayerConfigured = !!GATEWAY_PAYER_ADDRESS

  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  // EIP-5792 batched calls for smart wallets
  const {
    writeContracts,
    data: batchId,
    isPending: isBatchPending,
    error: batchError,
    reset: resetBatch,
  } = useWriteContracts()

  // Track batch status
  const batchIdString = batchId?.id
  const { data: batchStatus } = useCallsStatus({
    id: batchIdString as string,
    query: {
      enabled: !!batchIdString,
      refetchInterval: (data) =>
        data.state.data?.status === 'success' ? false : 1000,
    },
  })

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Get current mUSD balance for checking after mint
  const { refetch: refetchMUsd } = useReadContract({
    address: TOKENS.underlyingFeeToken.address,
    abi: MockUnderlyingFeeTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  const reset = useCallback(() => {
    setState(initialState)
    flowRef.current = null
    resetWrite()
    resetBatch()
  }, [resetWrite, resetBatch])

  // Handle batch completion (smart wallet flow)
  useEffect(() => {
    if (batchStatus?.status === 'success' && state.step === 'batch-confirming') {
      setState((s) => ({ ...s, step: 'success' }))
      refetchMUsd()
    }
    // Handle batch failure
    if (batchStatus?.status === 'failure' && state.step === 'batch-confirming') {
      setState((s) => ({
        ...s,
        step: 'error',
        error: new Error('Batch transaction failed'),
      }))
    }
  }, [batchStatus?.status, state.step, refetchMUsd])

  // Handle batch errors
  useEffect(() => {
    if (batchError && state.step !== 'error' && state.isBatchMode) {
      setState((s) => ({ ...s, step: 'error', error: batchError }))
    }
  }, [batchError, state.step, state.isBatchMode])

  /**
   * Continue to the next step in the harvest flow
   */
  const continueFlow = useCallback(async () => {
    if (!address || !walletClient) return
    if (!flowRef.current) return

    const { asset, yieldAmount, recipient } = flowRef.current
    const currentStep = state.step

    try {
      // After withdraw confirms → mint mUSD
      if (currentStep === 'withdraw-confirming') {
        setState((s) => ({ ...s, step: 'minting' }))

        // Calculate mUSD amount (mock 1:1 for stablecoins, use USD value for WETH)
        const usdValue = assetToUsd(yieldAmount, asset)
        const mUsdAmount = BigInt(Math.floor(usdValue * 1e6)) // 6 decimals

        setState((s) => ({ ...s, mUsdAmount }))

        // Mint mUSD (testnet faucet mint)
        writeContract({
          address: TOKENS.underlyingFeeToken.address,
          abi: MockUnderlyingFeeTokenAbi,
          functionName: 'mint',
          args: [address, mUsdAmount],
          chainId: baseSepolia.id,
        })
        return
      }

      // After mint confirms → sign permit and deposit
      if (currentStep === 'mint-confirming') {
        setState((s) => ({ ...s, step: 'signing' }))

        const mUsdAmount = state.mUsdAmount
        if (mUsdAmount <= 0n) {
          throw new Error('No mUSD to deposit')
        }

        // Calculate split (all to payer registry for simplicity)
        const payerAmount = mUsdAmount
        const appChainAmount = 0n

        // Sign permit
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60)
        const permit = await generatePermitSignature(
          walletClient,
          address,
          CONTRACTS.depositSplitter,
          mUsdAmount,
          deadline
        )

        setState((s) => ({ ...s, step: 'depositing' }))

        // Deposit to payer registry (user's address or app gateway)
        writeContract({
          address: CONTRACTS.depositSplitter,
          abi: DepositSplitterAbi,
          functionName: 'depositFromUnderlyingWithPermit',
          args: [
            recipient,
            payerAmount,
            recipient,
            appChainAmount,
            GAS_RESERVE_CONSTANTS.bridgeGasLimit,
            GAS_RESERVE_CONSTANTS.bridgeMaxFeePerGas,
            deadline,
            permit.v,
            permit.r,
            permit.s,
          ],
          chainId: baseSepolia.id,
        })
        return
      }

      // After deposit confirms → success
      if (currentStep === 'deposit-confirming') {
        setState((s) => ({ ...s, step: 'success' }))
        refetchMUsd()
        return
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        step: 'error',
        error: err instanceof Error ? err : new Error('Harvest failed'),
      }))
    }
  }, [address, walletClient, state.step, state.mUsdAmount, writeContract, refetchMUsd])

  // Handle write errors
  useEffect(() => {
    if (writeError && state.step !== 'error' && state.step !== 'idle') {
      setState((s) => ({ ...s, step: 'error', error: writeError }))
    }
  }, [writeError, state.step])

  // Handle transaction confirmations and advance to next step
  useEffect(() => {
    if (!isSuccess || !hash) return

    const currentStep = state.step

    if (currentStep === 'withdrawing') {
      setState((s) => ({ ...s, step: 'withdraw-confirming', txHash: hash }))
      // Auto-continue to next step
      setTimeout(() => continueFlow(), 500)
    } else if (currentStep === 'minting') {
      setState((s) => ({ ...s, step: 'mint-confirming', txHash: hash }))
      setTimeout(() => continueFlow(), 500)
    } else if (currentStep === 'depositing') {
      setState((s) => ({ ...s, step: 'deposit-confirming', txHash: hash }))
      setTimeout(() => {
        setState((s) => ({ ...s, step: 'success' }))
        refetchMUsd()
      }, 500)
    }
  }, [isSuccess, hash, state.step, continueFlow, refetchMUsd])

  /**
   * Withdraw assets from Aave only (no gateway deposit)
   */
  const withdraw = useCallback(
    async (asset: AaveAssetKey, amount: bigint) => {
      if (!address) {
        setState((s) => ({ ...s, step: 'error', error: new Error('Wallet not connected') }))
        return
      }

      setState({
        ...initialState,
        step: 'withdrawing',
        asset,
        yieldAmount: amount,
      })

      try {
        const assetConfig = AAVE_ASSETS[asset]

        writeContract({
          address: AAVE_V3.pool,
          abi: AaveV3PoolAbi,
          functionName: 'withdraw',
          args: [assetConfig.underlying, amount, address],
          chainId: baseSepolia.id,
        })
      } catch (err) {
        setState((s) => ({
          ...s,
          step: 'error',
          error: err instanceof Error ? err : new Error('Withdraw failed'),
        }))
      }
    },
    [address, writeContract]
  )

  /**
   * Full harvest flow: withdraw → mint mUSD → deposit to payer registry
   * 
   * @param destination - 'user' (default) deposits to connected wallet, 'app' deposits to gateway payer
   * 
   * For smart wallets: Uses EIP-5792 batched calls (single signature)
   * For EOA wallets: Multi-step flow with individual transactions
   */
  const harvestAndDeposit = useCallback(
    async (asset: AaveAssetKey, yieldAmount: bigint, destination: HarvestDestination = 'user') => {
      if (!address || !walletClient) {
        setState((s) => ({ ...s, step: 'error', error: new Error('Wallet not connected') }))
        return
      }

      // Determine deposit recipient based on destination
      const recipient: `0x${string}` = destination === 'app' 
        ? GATEWAY_PAYER_ADDRESS! 
        : address

      // Validate app payer is configured if using 'app' destination
      if (destination === 'app' && !GATEWAY_PAYER_ADDRESS) {
        setState((s) => ({
          ...s,
          step: 'error',
          error: new Error('App payer address not configured. Set VITE_GATEWAY_PAYER_ADDRESS in .env'),
        }))
        return
      }

      if (yieldAmount <= 0n) {
        setState((s) => ({ ...s, step: 'error', error: new Error('No yield to harvest') }))
        return
      }

      // Calculate mUSD amount upfront
      const usdValue = assetToUsd(yieldAmount, asset)
      const mUsdAmount = BigInt(Math.floor(usdValue * 1e6))
      const assetConfig = AAVE_ASSETS[asset]

      // ─── Smart Wallet Batched Flow ───────────────────────────────────
      // All operations in a single EIP-5792 batch with one signature
      if (supportsBatchedCalls) {
        setState({
          step: 'batching',
          asset,
          yieldAmount,
          mUsdAmount,
          error: null,
          txHash: undefined,
          isBatchMode: true,
          depositRecipient: recipient,
        })

        try {
          // For batched mode, we use approve instead of permit (no off-chain sig needed)
          // Build all 4 calls for the batch
          writeContracts({
            contracts: [
              // Call 1: Withdraw yield from Aave
              {
                address: AAVE_V3.pool,
                abi: AaveV3PoolAbi,
                functionName: 'withdraw',
                args: [assetConfig.underlying, yieldAmount, address],
              },
              // Call 2: Mint mUSD (testnet mock swap)
              {
                address: TOKENS.underlyingFeeToken.address,
                abi: MockUnderlyingFeeTokenAbi,
                functionName: 'mint',
                args: [address, mUsdAmount],
              },
              // Call 3: Approve DepositSplitter to spend mUSD
              {
                address: TOKENS.underlyingFeeToken.address,
                abi: ERC20Abi,
                functionName: 'approve',
                args: [CONTRACTS.depositSplitter, mUsdAmount],
              },
              // Call 4: Deposit to payer registry via DepositSplitter
              {
                address: CONTRACTS.depositSplitter,
                abi: DepositSplitterAbi,
                functionName: 'depositFromUnderlying',
                args: [
                  recipient,
                  mUsdAmount,
                  recipient,
                  0n, // appChainAmount
                  GAS_RESERVE_CONSTANTS.bridgeGasLimit,
                  GAS_RESERVE_CONSTANTS.bridgeMaxFeePerGas,
                ],
              },
            ],
            chainId: baseSepolia.id,
          })

          setState((s) => ({ ...s, step: 'batch-confirming' }))
        } catch (err) {
          setState((s) => ({
            ...s,
            step: 'error',
            error: err instanceof Error ? err : new Error('Batched harvest failed'),
          }))
        }
        return
      }

      // ─── EOA Multi-Step Flow ─────────────────────────────────────────
      // Store flow params for continuation
      flowRef.current = { asset, yieldAmount, recipient }

      setState({
        step: 'withdrawing',
        asset,
        yieldAmount,
        mUsdAmount,
        error: null,
        txHash: undefined,
        isBatchMode: false,
        depositRecipient: recipient,
      })

      try {
        // Step 1: Withdraw from Aave
        writeContract({
          address: AAVE_V3.pool,
          abi: AaveV3PoolAbi,
          functionName: 'withdraw',
          args: [assetConfig.underlying, yieldAmount, address],
          chainId: baseSepolia.id,
        })
      } catch (err) {
        setState((s) => ({
          ...s,
          step: 'error',
          error: err instanceof Error ? err : new Error('Harvest failed'),
        }))
      }
    },
    [address, walletClient, writeContract, writeContracts, supportsBatchedCalls]
  )

  const isPending =
    isWritePending ||
    isBatchPending ||
    isConfirming ||
    ['withdrawing', 'withdraw-confirming', 'minting', 'mint-confirming', 'signing', 'depositing', 'deposit-confirming', 'batching', 'batch-confirming'].includes(state.step)

  return {
    state,
    isPending,
    harvestAndDeposit,
    withdraw,
    continueFlow,
    reset,
    supportsBatchedCalls,
    walletTypeLabel,
    isAppPayerConfigured,
  }
}
