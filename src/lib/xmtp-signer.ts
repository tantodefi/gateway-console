import { type Signer, IdentifierKind } from '@xmtp/browser-sdk'
import { privateKeyToAccount } from 'viem/accounts'
import { toBytes } from 'viem'
import type { Hex, WalletClient, Address, PublicClient } from 'viem'
import type { WalletTypeInfo } from '@/types/wallet-type'

/** EIP-7702 delegation designator prefix */
const EIP7702_PREFIX = '0xef0100'

/** Coinbase wallet connector IDs (supports both EOA and Smart Wallet) */
export const COINBASE_CONNECTOR_IDS = [
  'coinbase',
  'coinbaseWalletSDK',
  'com.coinbase.wallet',
] as const

/** Check if a connector is Coinbase Wallet */
export function isCoinbaseWallet(connectorId: string): boolean {
  return COINBASE_CONNECTOR_IDS.includes(connectorId as typeof COINBASE_CONNECTOR_IDS[number])
}

/**
 * Creates an XMTP signer from an ephemeral private key.
 * The signer implements the EOA interface required by the XMTP browser SDK.
 */
export function createEphemeralSigner(privateKey: Hex): Signer {
  const account = privateKeyToAccount(privateKey)

  return {
    type: 'EOA',
    getIdentifier: () => ({
      identifier: account.address.toLowerCase(),
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string) => {
      const signature = await account.signMessage({ message })
      return toBytes(signature)
    },
  }
}

/**
 * Creates an XMTP signer from a wagmi wallet client.
 * Used for signing with the user's connected wallet (MetaMask, etc.)
 */
export function createWalletSigner(walletClient: WalletClient, address: Address): Signer {
  return {
    type: 'EOA',
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string) => {
      const signature = await walletClient.signMessage({
        account: address,
        message,
      })
      return toBytes(signature)
    },
  }
}

/**
 * Creates an XMTP signer for Smart Contract Wallets (SCW).
 * SCW signers require a chainId for EIP-1271 signature verification.
 */
export function createSCWSigner(
  walletClient: WalletClient,
  address: Address,
  chainId: number
): Signer {
  return {
    type: 'SCW',
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string) => {
      const signature = await walletClient.signMessage({
        account: address,
        message,
      })
      return toBytes(signature)
    },
    getChainId: () => BigInt(chainId),
  }
}

/**
 * Detects the wallet type by checking on-chain bytecode.
 * - EOA: No bytecode (empty)
 * - EIP-7702: Bytecode starts with 0xef0100 (delegation designator)
 * - SCW: Has bytecode (smart contract wallet like Coinbase Smart Wallet, Safe)
 *
 * Note: We always check bytecode rather than relying on connector ID because
 * wallets like Coinbase support both EOAs and Smart Wallets.
 */
export async function detectWalletType(
  publicClient: PublicClient,
  address: Address,
  connectorId: string,
  chainId: number
): Promise<WalletTypeInfo> {
  try {
    const bytecode = await publicClient.getCode({ address })

    // No bytecode = EOA (even if using Coinbase Wallet connector)
    if (!bytecode || bytecode === '0x') {
      return { type: 'EOA', connectorId, chainId }
    }

    // Check for EIP-7702 delegation prefix
    if (bytecode.toLowerCase().startsWith(EIP7702_PREFIX)) {
      // Extract delegate address from bytecode (20 bytes after prefix)
      const delegateAddress = ('0x' + bytecode.slice(8, 48)) as Address
      return { type: 'EIP7702', connectorId, chainId, delegateAddress }
    }

    // Has bytecode but not EIP-7702 = Smart Contract Wallet
    return { type: 'SCW', connectorId, chainId }
  } catch (error) {
    console.warn('[XMTP] Failed to detect wallet type, defaulting to EOA:', error)
    return { type: 'EOA', connectorId, chainId }
  }
}

/**
 * Creates the appropriate XMTP signer based on wallet type.
 * Automatically detects wallet type and creates EOA or SCW signer.
 */
export async function createSignerForWallet(
  walletClient: WalletClient,
  publicClient: PublicClient,
  address: Address,
  connectorId: string,
  chainId: number
): Promise<{ signer: Signer; walletTypeInfo: WalletTypeInfo }> {
  const walletTypeInfo = await detectWalletType(publicClient, address, connectorId, chainId)

  let signer: Signer
  if (walletTypeInfo.type === 'EOA') {
    signer = createWalletSigner(walletClient, address)
  } else {
    // Both SCW and EIP-7702 use SCW signer (both need chainId)
    signer = createSCWSigner(walletClient, address, chainId)
  }

  return { signer, walletTypeInfo }
}
