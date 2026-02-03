import { useMemo } from 'react'
import {
  useAccount,
  usePublicClient,
  useCapabilities,
} from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { isCoinbaseWallet } from '@/lib/xmtp-signer'

export interface SmartWalletCapabilities {
  /** Whether this wallet supports EIP-5792 batched calls */
  supportsBatchedCalls: boolean
  /** Whether the wallet is a smart contract wallet */
  isSmartWallet: boolean
  /** Whether atomic batch mode is supported (all-or-nothing) */
  supportsAtomicBatch: boolean
  /** Whether paymaster (gasless) is available */
  supportsPaymaster: boolean
  /** Human readable wallet type for UI */
  walletTypeLabel: string
}

/**
 * Hook to detect smart wallet capabilities for EIP-5792 batched transactions
 *
 * Smart wallets like Coinbase Smart Wallet support wallet_sendCalls which allows
 * batching multiple contract calls into a single user operation with one signature.
 *
 * This is useful for the harvest flow where we need to:
 * 1. Withdraw from Aave
 * 2. Mint mUSD
 * 3. Deposit to gateway
 *
 * With EIP-5792, these can all be signed once instead of 3 separate transactions.
 */
export function useSmartWalletBatch(): SmartWalletCapabilities {
  const { connector, isConnected } = useAccount()
  const publicClient = usePublicClient({ chainId: baseSepolia.id })

  // Query wallet capabilities using EIP-5792
  const { data: capabilities } = useCapabilities()

  const result = useMemo((): SmartWalletCapabilities => {
    if (!isConnected || !connector) {
      return {
        supportsBatchedCalls: false,
        isSmartWallet: false,
        supportsAtomicBatch: false,
        supportsPaymaster: false,
        walletTypeLabel: 'Not connected',
      }
    }

    const connectorId = connector.id

    // Check if it's a Coinbase Smart Wallet
    const isCoinbaseSCW = isCoinbaseWallet(connectorId)

    // Check capabilities for Base Sepolia chain
    const chainCapabilities = capabilities?.[baseSepolia.id]

    // Check if wallet reports atomic batch support via EIP-5792
    const atomicBatchSupported = chainCapabilities?.atomicBatch?.supported === true
    const sendCallsSupported = atomicBatchSupported || isCoinbaseSCW

    // Check paymaster support
    const paymasterSupported = chainCapabilities?.paymasterService?.supported === true

    // Determine if this is a smart wallet
    // Coinbase Smart Wallet reports atomicBatch capability
    const isSmartWallet = isCoinbaseSCW || atomicBatchSupported

    let walletTypeLabel = 'EOA Wallet'
    if (isCoinbaseSCW) {
      walletTypeLabel = 'Coinbase Smart Wallet'
    } else if (isSmartWallet) {
      walletTypeLabel = 'Smart Wallet'
    }

    return {
      supportsBatchedCalls: sendCallsSupported,
      isSmartWallet,
      supportsAtomicBatch: atomicBatchSupported,
      supportsPaymaster: paymasterSupported,
      walletTypeLabel,
    }
  }, [isConnected, connector, capabilities, publicClient])

  return result
}

/**
 * Encode permit signature into call data format for batched transactions
 * When batching, we can use multicall or direct approve instead of permit
 */
export function encodeApproveCall(
  tokenAddress: `0x${string}`,
  spenderAddress: `0x${string}`,
  amount: bigint
): { to: `0x${string}`; data: `0x${string}`; value?: bigint } {
  // ERC20 approve(address spender, uint256 amount) selector = 0x095ea7b3
  const selector = '0x095ea7b3'
  const spenderPadded = spenderAddress.slice(2).padStart(64, '0')
  const amountHex = amount.toString(16).padStart(64, '0')
  const data = `${selector}${spenderPadded}${amountHex}` as `0x${string}`

  return {
    to: tokenAddress,
    data,
  }
}
