/**
 * Wallet type definitions for XMTP signer creation
 *
 * XMTP requires different signer configurations for:
 * - EOA (Externally Owned Accounts): Standard wallets like MetaMask
 * - SCW (Smart Contract Wallets): EIP-4337 wallets like Coinbase Smart Wallet, Safe
 * - EIP7702: EOAs with delegated smart contract implementations
 */

/**
 * The type of wallet connected
 * - EOA: Standard externally owned account
 * - SCW: Smart contract wallet (EIP-4337)
 * - EIP7702: EOA with delegation to smart contract
 */
export type WalletType = 'EOA' | 'SCW' | 'EIP7702'

/**
 * Information about the detected wallet type
 */
export interface WalletTypeInfo {
  /** The detected wallet type */
  type: WalletType
  /** The connector ID from wagmi/RainbowKit */
  connectorId: string
  /** The chain ID the wallet is connected to */
  chainId: number
  /** For EIP-7702 wallets, the address of the delegate contract */
  delegateAddress?: string
}
