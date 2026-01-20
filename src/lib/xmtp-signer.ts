import { type Signer, IdentifierKind } from '@xmtp/browser-sdk'
import { privateKeyToAccount } from 'viem/accounts'
import { toBytes } from 'viem'
import type { Hex, WalletClient, Address, PublicClient } from 'viem'
import type { WalletType, WalletTypeInfo } from '@/types/wallet-type'

/** EIP-7702 delegation designator prefix */
const EIP7702_PREFIX = '0xef0100'

/** Known smart contract wallet connector IDs */
const SCW_CONNECTOR_IDS = [
  'coinbaseWalletSDK',
  'com.coinbase.wallet',
  'safe',
  'app.safe',
]

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
 * SCW signers require a chainId for proper signature verification.
 * Used for EIP-4337 wallets (Coinbase Smart Wallet, Safe) and EIP-7702 delegated EOAs.
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
 * - SCW: Any other bytecode (smart contract wallet)
 */
export async function detectWalletType(
  publicClient: PublicClient,
  address: Address,
  connectorId: string,
  chainId: number
): Promise<WalletTypeInfo> {
  // First check connector ID for known SCW wallets
  if (SCW_CONNECTOR_IDS.includes(connectorId)) {
    return { type: 'SCW', connectorId, chainId }
  }

  try {
    const bytecode = await publicClient.getCode({ address })

    // No bytecode = EOA
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

  console.log('[XMTP] Detected wallet type:', walletTypeInfo)

  let signer: Signer
  if (walletTypeInfo.type === 'EOA') {
    signer = createWalletSigner(walletClient, address)
  } else {
    // Both SCW and EIP-7702 use SCW signer (both need chainId)
    signer = createSCWSigner(walletClient, address, chainId)
  }

  return { signer, walletTypeInfo }
}
