import { type Signer, IdentifierKind } from '@xmtp/browser-sdk'
import { privateKeyToAccount } from 'viem/accounts'
import { toBytes } from 'viem'
import type { Hex, WalletClient, Address } from 'viem'

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
