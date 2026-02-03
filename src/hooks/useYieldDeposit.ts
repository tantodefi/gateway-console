import { useCallback, useState, useEffect } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
} from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { parseUnits } from 'viem'
import { AaveV3PoolAbi } from '@/abi/AaveV3Pool'
import { WETHAbi } from '@/abi/WETH'
import { ERC20Abi } from '@/abi/ERC20'
import {
  AAVE_V3,
  AAVE_ASSETS,
  YIELD_CONFIG,
  type AaveAssetKey,
} from '@/lib/constants'
import {
  assetToUsd,
  meetsMinimumDeposit,
  getMinimumDepositError,
} from '@/lib/yieldCalculations'

export type YieldDepositStatus =
  | 'idle'
  | 'approving'
  | 'wrapping'
  | 'supplying'
  | 'pending'
  | 'confirming'
  | 'success'
  | 'error'

export interface YieldDepositResult {
  /** Current status of the deposit operation */
  status: YieldDepositStatus
  /** Error if any */
  error: Error | null
  /** Deposit function */
  deposit: (amount: string, asset: AaveAssetKey, useNativeEth?: boolean) => Promise<void>
  /** Reset state */
  reset: () => void
  /** Transaction hash if available */
  txHash: `0x${string}` | undefined
  /** Is transaction pending */
  isPending: boolean
  /** User's token balances */
  balances: {
    usdc: bigint | undefined
    weth: bigint | undefined
    eth: bigint | undefined
  }
  /** Refetch balances */
  refetchBalances: () => void
}

/**
 * Hook for depositing assets into Aave V3 to earn yield
 */
export function useYieldDeposit(): YieldDepositResult {
  const [status, setStatus] = useState<YieldDepositStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [currentStep, setCurrentStep] = useState<'approve' | 'wrap' | 'supply'>('approve')

  const { address } = useAccount()

  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Get user's USDC balance
  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: AAVE_ASSETS.USDC.underlying,
    abi: ERC20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  // Get user's WETH balance
  const { data: wethBalance, refetch: refetchWeth } = useReadContract({
    address: AAVE_ASSETS.WETH.underlying,
    abi: ERC20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  // Get user's native ETH balance
  const { data: ethBalanceData, refetch: refetchEth } = useBalance({
    address,
    chainId: baseSepolia.id,
  })

  // Get allowance for USDC
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: AAVE_ASSETS.USDC.underlying,
    abi: ERC20Abi,
    functionName: 'allowance',
    args: address ? [address, AAVE_V3.pool] : undefined,
    chainId: baseSepolia.id,
  })

  // Get allowance for WETH
  const { data: wethAllowance, refetch: refetchWethAllowance } = useReadContract({
    address: AAVE_ASSETS.WETH.underlying,
    abi: ERC20Abi,
    functionName: 'allowance',
    args: address ? [address, AAVE_V3.pool] : undefined,
    chainId: baseSepolia.id,
  })

  const refetchBalances = useCallback(() => {
    refetchUsdc()
    refetchWeth()
    refetchEth()
    refetchUsdcAllowance()
    refetchWethAllowance()
  }, [refetchUsdc, refetchWeth, refetchEth, refetchUsdcAllowance, refetchWethAllowance])

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      setError(writeError)
      setStatus('error')
    }
  }, [writeError])

  // Handle success - chain the next step or complete
  useEffect(() => {
    if (isSuccess && hash) {
      if (currentStep === 'approve' || currentStep === 'wrap') {
        // There might be more steps, but for now just mark success
        // A more complex flow would continue to the next step
        setStatus('success')
        refetchBalances()
      } else if (currentStep === 'supply') {
        setStatus('success')
        refetchBalances()
      }
    }
  }, [isSuccess, hash, currentStep, refetchBalances])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setCurrentStep('approve')
    resetWrite()
  }, [resetWrite])

  const deposit = useCallback(
    async (amountString: string, asset: AaveAssetKey, useNativeEth: boolean = false) => {
      if (!address) {
        setError(new Error('Wallet not connected'))
        setStatus('error')
        return
      }

      const assetConfig = AAVE_ASSETS[asset]
      const amount = parseUnits(amountString, assetConfig.decimals)

      // Check minimum deposit
      const usdValue = assetToUsd(amount, asset)
      if (!meetsMinimumDeposit(usdValue)) {
        setError(new Error(getMinimumDepositError(usdValue) || 'Below minimum deposit'))
        setStatus('error')
        return
      }

      // Check balance
      const balance = asset === 'USDC' ? usdcBalance : wethBalance
      if (useNativeEth && asset === 'WETH') {
        // For native ETH, we need to wrap first
        const ethBalance = ethBalanceData?.value ?? 0n
        if (amount > ethBalance) {
          setError(new Error('Insufficient ETH balance'))
          setStatus('error')
          return
        }
      } else if (balance !== undefined && amount > balance) {
        setError(new Error(`Insufficient ${asset} balance`))
        setStatus('error')
        return
      }

      setError(null)

      try {
        // Step 1: If using native ETH, wrap it first
        if (useNativeEth && asset === 'WETH') {
          setStatus('wrapping')
          setCurrentStep('wrap')
          writeContract({
            address: AAVE_ASSETS.WETH.underlying,
            abi: WETHAbi,
            functionName: 'deposit',
            value: amount,
            chainId: baseSepolia.id,
          })
          // After wrapping succeeds, user needs to call deposit again
          // This is a simplified flow - a production version would chain transactions
          return
        }

        // Step 2: Check and handle approval
        const allowance = asset === 'USDC' ? usdcAllowance : wethAllowance
        const allowanceBigInt = typeof allowance === 'bigint' ? allowance : 0n
        if (allowanceBigInt < amount) {
          setStatus('approving')
          setCurrentStep('approve')
          writeContract({
            address: assetConfig.underlying,
            abi: ERC20Abi,
            functionName: 'approve',
            args: [AAVE_V3.pool, amount],
            chainId: baseSepolia.id,
          })
          // After approval succeeds, user needs to call deposit again
          return
        }

        // Step 3: Supply to Aave
        setStatus('supplying')
        setCurrentStep('supply')
        writeContract({
          address: AAVE_V3.pool,
          abi: AaveV3PoolAbi,
          functionName: 'supply',
          args: [
            assetConfig.underlying,
            amount,
            address,
            YIELD_CONFIG.referralCode,
          ],
          chainId: baseSepolia.id,
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Deposit failed'))
        setStatus('error')
      }
    },
    [
      address,
      usdcBalance,
      wethBalance,
      ethBalanceData?.value,
      usdcAllowance,
      wethAllowance,
      writeContract,
    ]
  )

  return {
    status,
    error,
    deposit,
    reset,
    txHash: hash,
    isPending: isWritePending || isConfirming,
    balances: {
      usdc: usdcBalance,
      weth: wethBalance,
      eth: ethBalanceData?.value,
    },
    refetchBalances,
  }
}
