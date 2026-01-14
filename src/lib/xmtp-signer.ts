import { type Signer, IdentifierKind } from '@xmtp/browser-sdk'
import { privateKeyToAccount } from 'viem/accounts'
import { toBytes } from 'viem'
import type { Hex } from 'viem'

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
