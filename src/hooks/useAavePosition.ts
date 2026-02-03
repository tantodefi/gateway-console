import { useMemo } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { AaveATokenAbi } from '@/abi/AaveAToken'
import { AaveV3PoolAbi } from '@/abi/AaveV3Pool'
import {
  AAVE_V3,
  AAVE_ASSETS,
  YIELD_CONFIG,
  type AaveAssetKey,
} from '@/lib/constants'
import {
  calculateAccruedYield,
  calculateYieldProjection,
  assetToUsd,
  formatTokenAmount,
  formatCurrency,
} from '@/lib/yieldCalculations'

export interface AavePosition {
  /** Asset key (USDC, WETH, etc.) */
  asset: AaveAssetKey
  /** aToken balance (includes accrued interest) */
  aTokenBalance: bigint
  /** Scaled balance (principal without interest) */
  scaledBalance: bigint
  /** Accrued yield in token units */
  accruedYield: bigint
  /** Accrued yield in USD */
  accruedYieldUsd: number
  /** Total position value in USD */
  positionValueUsd: number
  /** Current APY from reserve data (in ray units, 27 decimals) */
  currentLiquidityRate: bigint
  /** Estimated APY percentage */
  apyPercent: number
  /** Estimated messages per month from yield */
  estimatedMessagesPerMonth: number
  /** Formatted displays */
  formatted: {
    aTokenBalance: string
    accruedYield: string
    positionValue: string
    messagesPerMonth: string
    apy: string
  }
}

export interface UseAavePositionResult {
  /** Positions for each asset */
  positions: Record<AaveAssetKey, AavePosition | null>
  /** Total position value in USD across all assets */
  totalValueUsd: number
  /** Total accrued yield in USD across all assets */
  totalYieldUsd: number
  /** Total estimated messages per month from all yield */
  totalMessagesPerMonth: number
  /** Is loading any position data */
  isLoading: boolean
  /** Refetch all position data */
  refetch: () => void
  /** Formatted totals */
  formatted: {
    totalValue: string
    totalYield: string
    totalMessages: string
  }
}

/**
 * Hook to read user's Aave V3 positions and calculate yield
 */
export function useAavePosition(): UseAavePositionResult {
  const { address } = useAccount()

  // ============ USDC Position ============
  const { data: usdcATokenBalance, refetch: refetchUsdcAToken, isLoading: isLoadingUsdcAToken } = useReadContract({
    address: AAVE_ASSETS.USDC.aToken,
    abi: AaveATokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  const { data: usdcScaledBalance, refetch: refetchUsdcScaled, isLoading: isLoadingUsdcScaled } = useReadContract({
    address: AAVE_ASSETS.USDC.aToken,
    abi: AaveATokenAbi,
    functionName: 'scaledBalanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  const { data: usdcReserveData, refetch: refetchUsdcReserve, isLoading: isLoadingUsdcReserve } = useReadContract({
    address: AAVE_V3.pool,
    abi: AaveV3PoolAbi,
    functionName: 'getReserveData',
    args: [AAVE_ASSETS.USDC.underlying],
    chainId: baseSepolia.id,
  })

  // ============ WETH Position ============
  const { data: wethATokenBalance, refetch: refetchWethAToken, isLoading: isLoadingWethAToken } = useReadContract({
    address: AAVE_ASSETS.WETH.aToken,
    abi: AaveATokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  const { data: wethScaledBalance, refetch: refetchWethScaled, isLoading: isLoadingWethScaled } = useReadContract({
    address: AAVE_ASSETS.WETH.aToken,
    abi: AaveATokenAbi,
    functionName: 'scaledBalanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  const { data: wethReserveData, refetch: refetchWethReserve, isLoading: isLoadingWethReserve } = useReadContract({
    address: AAVE_V3.pool,
    abi: AaveV3PoolAbi,
    functionName: 'getReserveData',
    args: [AAVE_ASSETS.WETH.underlying],
    chainId: baseSepolia.id,
  })

  // ============ Calculate Positions ============
  const positions = useMemo((): Record<AaveAssetKey, AavePosition | null> => {
    const createPosition = (
      asset: AaveAssetKey,
      aTokenBalance: bigint | undefined,
      scaledBalance: bigint | undefined,
      reserveData: { currentLiquidityRate: bigint } | undefined
    ): AavePosition | null => {
      if (!aTokenBalance || aTokenBalance === 0n) return null

      const assetConfig = AAVE_ASSETS[asset]
      const scaled = scaledBalance ?? 0n

      // Calculate accrued yield
      // Note: scaledBalance is in ray units (27 decimals) for Aave
      // For simplicity, we use current balance - (scaled * some factor)
      // In production, you'd use the liquidity index properly
      const { yieldAmount, yieldUsd } = calculateAccruedYield(
        aTokenBalance,
        scaled, // This is approximate - real calculation needs liquidity index
        assetConfig.decimals
      )

      const positionValueUsd = assetToUsd(aTokenBalance, asset)

      // Convert Aave's ray-based rate (27 decimals) to percentage
      // currentLiquidityRate is in ray (1e27 = 100%)
      const liquidityRate = reserveData?.currentLiquidityRate ?? 0n
      const apyPercent = Number(liquidityRate) / 1e25 // Convert to percentage

      // Use actual APY if available, otherwise fallback
      const effectiveApyBps = apyPercent > 0 ? apyPercent * 100 : YIELD_CONFIG.estimatedApyBps
      const projection = calculateYieldProjection(positionValueUsd, effectiveApyBps)

      return {
        asset,
        aTokenBalance,
        scaledBalance: scaled,
        accruedYield: yieldAmount,
        accruedYieldUsd: yieldUsd,
        positionValueUsd,
        currentLiquidityRate: liquidityRate,
        apyPercent,
        estimatedMessagesPerMonth: projection.messagesPerMonth,
        formatted: {
          aTokenBalance: formatTokenAmount(aTokenBalance, assetConfig.decimals, `a${assetConfig.symbol}`),
          accruedYield: formatCurrency(yieldUsd, 6),
          positionValue: formatCurrency(positionValueUsd),
          messagesPerMonth: projection.formattedMessagesPerMonth,
          apy: `${apyPercent.toFixed(2)}%`,
        },
      }
    }

    return {
      USDC: createPosition('USDC', usdcATokenBalance, usdcScaledBalance, usdcReserveData),
      WETH: createPosition('WETH', wethATokenBalance, wethScaledBalance, wethReserveData),
      USDT: null, // Not tracking USDT for now
    }
  }, [
    usdcATokenBalance,
    usdcScaledBalance,
    usdcReserveData,
    wethATokenBalance,
    wethScaledBalance,
    wethReserveData,
  ])

  // ============ Calculate Totals ============
  const totals = useMemo(() => {
    let totalValueUsd = 0
    let totalYieldUsd = 0
    let totalMessagesPerMonth = 0

    const positionValues = Object.values(positions) as (AavePosition | null)[]
    positionValues.forEach((pos) => {
      if (pos) {
        totalValueUsd += pos.positionValueUsd
        totalYieldUsd += pos.accruedYieldUsd
        totalMessagesPerMonth += pos.estimatedMessagesPerMonth
      }
    })

    return {
      totalValueUsd,
      totalYieldUsd,
      totalMessagesPerMonth,
      formatted: {
        totalValue: formatCurrency(totalValueUsd),
        totalYield: formatCurrency(totalYieldUsd, 6),
        totalMessages: totalMessagesPerMonth.toLocaleString(),
      },
    }
  }, [positions])

  const isLoading =
    isLoadingUsdcAToken ||
    isLoadingUsdcScaled ||
    isLoadingUsdcReserve ||
    isLoadingWethAToken ||
    isLoadingWethScaled ||
    isLoadingWethReserve

  const refetch = () => {
    refetchUsdcAToken()
    refetchUsdcScaled()
    refetchUsdcReserve()
    refetchWethAToken()
    refetchWethScaled()
    refetchWethReserve()
  }

  return {
    positions,
    ...totals,
    isLoading,
    refetch,
  }
}
