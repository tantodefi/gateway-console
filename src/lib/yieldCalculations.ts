/**
 * Yield calculation utilities for Aave V3 integration
 *
 * Calculates expected yield, messages per month, and projections
 * based on deposit amount, APY, and XMTP messaging costs.
 */

import { YIELD_CONFIG, AAVE_ASSETS, type AaveAssetKey } from './constants'

// Cost per message calculation (from messageCosting.ts)
const FALLBACK_MESSAGE_BYTES = 1024
const FALLBACK_STORAGE_DAYS = 60
const FALLBACK_GAS_OVERHEAD_ESTIMATE = 1.25
const PICODOLLAR_SCALE = 1e12

// Fallback rates (in picodollars)
const FALLBACK_MESSAGE_FEE = 38_500_000n
const FALLBACK_STORAGE_FEE = 22n

/**
 * Calculate the cost per message in USD
 */
export function getCostPerMessage(): number {
  const storageComponent =
    FALLBACK_STORAGE_FEE * BigInt(FALLBACK_MESSAGE_BYTES) * BigInt(FALLBACK_STORAGE_DAYS)
  const baseCostPicodollars = FALLBACK_MESSAGE_FEE + storageComponent
  const totalCostPicodollars = BigInt(
    Math.round(Number(baseCostPicodollars) * FALLBACK_GAS_OVERHEAD_ESTIMATE)
  )
  return Number(totalCostPicodollars) / PICODOLLAR_SCALE
}

export interface YieldProjection {
  /** Deposit amount in USD */
  depositUsd: number
  /** Estimated APY as percentage (e.g., 3.5 for 3.5%) */
  apyPercent: number
  /** Monthly yield in USD */
  monthlyYieldUsd: number
  /** Yearly yield in USD */
  yearlyYieldUsd: number
  /** Messages per month from yield */
  messagesPerMonth: number
  /** Messages per year from yield */
  messagesPerYear: number
  /** Cost per message in USD */
  costPerMessage: number
  /** Formatted monthly yield */
  formattedMonthlyYield: string
  /** Formatted yearly yield */
  formattedYearlyYield: string
  /** Formatted messages per month */
  formattedMessagesPerMonth: string
  /** Formatted messages per year */
  formattedMessagesPerYear: string
}

/**
 * Calculate yield projections based on deposit amount
 *
 * @param depositUsd - Deposit amount in USD
 * @param apyBps - APY in basis points (e.g., 350 for 3.5%)
 * @returns Yield projection with messages per month
 */
export function calculateYieldProjection(
  depositUsd: number,
  apyBps: number = YIELD_CONFIG.estimatedApyBps
): YieldProjection {
  const apyPercent = apyBps / 100
  const yearlyYieldUsd = depositUsd * (apyPercent / 100)
  const monthlyYieldUsd = yearlyYieldUsd / 12

  const costPerMessage = getCostPerMessage()
  const messagesPerMonth = Math.floor(monthlyYieldUsd / costPerMessage)
  const messagesPerYear = Math.floor(yearlyYieldUsd / costPerMessage)

  return {
    depositUsd,
    apyPercent,
    monthlyYieldUsd,
    yearlyYieldUsd,
    messagesPerMonth,
    messagesPerYear,
    costPerMessage,
    formattedMonthlyYield: formatCurrency(monthlyYieldUsd),
    formattedYearlyYield: formatCurrency(yearlyYieldUsd),
    formattedMessagesPerMonth: messagesPerMonth.toLocaleString(),
    formattedMessagesPerYear: messagesPerYear.toLocaleString(),
  }
}

/**
 * Predefined deposit tiers with projections
 */
export interface DepositTier {
  depositUsd: number
  label: string
  projection: YieldProjection
}

/**
 * Get deposit tiers with yield projections for display
 */
export function getDepositTiers(apyBps: number = YIELD_CONFIG.estimatedApyBps): DepositTier[] {
  const tiers = [100, 250, 500, 1000, 5000, 10000]
  return tiers.map((depositUsd) => ({
    depositUsd,
    label: formatCurrency(depositUsd),
    projection: calculateYieldProjection(depositUsd, apyBps),
  }))
}

/**
 * Calculate accrued yield from aToken balance vs principal
 *
 * @param currentBalance - Current aToken balance (with yield)
 * @param principalBalance - Original deposit amount (scaled balance)
 * @param decimals - Token decimals
 * @returns Accrued yield in token units
 */
export function calculateAccruedYield(
  currentBalance: bigint,
  principalBalance: bigint,
  decimals: number
): {
  yieldAmount: bigint
  yieldUsd: number
  formattedYield: string
} {
  const yieldAmount = currentBalance > principalBalance
    ? currentBalance - principalBalance
    : 0n

  // Convert to USD (assumes 1:1 for stablecoins, would need oracle for WETH)
  const yieldUsd = Number(yieldAmount) / Math.pow(10, decimals)

  return {
    yieldAmount,
    yieldUsd,
    formattedYield: formatCurrency(yieldUsd, 6),
  }
}

/**
 * Convert asset amount to USD value
 * For testnet: assumes 1:1 for stablecoins, mock price for ETH
 *
 * @param amount - Amount in asset units
 * @param asset - Asset key (USDC, WETH, etc.)
 * @returns USD value
 */
export function assetToUsd(amount: bigint, asset: AaveAssetKey): number {
  const assetConfig = AAVE_ASSETS[asset]
  const tokenAmount = Number(amount) / Math.pow(10, assetConfig.decimals)

  // Mock prices for testnet
  const mockPrices: Record<AaveAssetKey, number> = {
    USDC: 1,
    USDT: 1,
    WETH: 2500, // Mock ETH price
  }

  return tokenAmount * (mockPrices[asset] || 1)
}

/**
 * Convert USD to asset amount
 *
 * @param usdAmount - Amount in USD
 * @param asset - Asset key
 * @returns Amount in asset units (bigint)
 */
export function usdToAsset(usdAmount: number, asset: AaveAssetKey): bigint {
  const assetConfig = AAVE_ASSETS[asset]

  // Mock prices for testnet
  const mockPrices: Record<AaveAssetKey, number> = {
    USDC: 1,
    USDT: 1,
    WETH: 2500,
  }

  const tokenAmount = usdAmount / (mockPrices[asset] || 1)
  return BigInt(Math.floor(tokenAmount * Math.pow(10, assetConfig.decimals)))
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, maxDecimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  }).format(amount)
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  symbol: string,
  maxDisplayDecimals: number = 4
): string {
  const value = Number(amount) / Math.pow(10, decimals)
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDisplayDecimals,
  })
  return `${formatted} ${symbol}`
}

/**
 * Check if deposit meets minimum threshold
 */
export function meetsMinimumDeposit(usdAmount: number): boolean {
  return usdAmount >= YIELD_CONFIG.minimumDepositUsd
}

/**
 * Get minimum deposit error message if below threshold
 */
export function getMinimumDepositError(usdAmount: number): string | null {
  if (meetsMinimumDeposit(usdAmount)) return null
  return `Minimum deposit is ${formatCurrency(YIELD_CONFIG.minimumDepositUsd)}`
}
