import type { WalletClient, Address, Hex, Chain, Transport, Account } from 'viem'
import { createPublicClient, http, getContract } from 'viem'
import { baseSepolia } from 'viem/chains'
import { MockUnderlyingFeeTokenAbi } from '@/abi/MockUnderlyingFeeToken'
import { TOKENS } from '@/lib/constants'

export interface PermitSignature {
  v: number
  r: Hex
  s: Hex
  deadline: bigint
}

/**
 * Generates an ERC-2612 permit signature for token spending.
 * This allows gasless approval - the spender can use this signature
 * to move tokens without the owner paying for an approval transaction.
 */
export async function generatePermitSignature(
  walletClient: WalletClient<Transport, Chain, Account>,
  owner: Address,
  spender: Address,
  value: bigint,
  deadline: bigint
): Promise<PermitSignature> {
  // Create a fresh public client to avoid type issues
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(import.meta.env.VITE_SETTLEMENT_CHAIN_RPC_URL),
  })
  const tokenAddress = TOKENS.underlyingFeeToken.address

  const contract = getContract({
    address: tokenAddress,
    abi: MockUnderlyingFeeTokenAbi,
    client: publicClient,
  })

  // Get the current nonce for the owner
  const nonce = await contract.read.nonces([owner])

  // Get the token name for the domain
  const tokenName = await contract.read.name()

  // EIP-712 domain - version defaults to '1' for most ERC-2612 tokens
  const domain = {
    name: tokenName,
    version: '1',
    chainId: await publicClient.getChainId(),
    verifyingContract: tokenAddress,
  }

  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  }

  const message = {
    owner,
    spender,
    value,
    nonce,
    deadline,
  }

  // Sign the permit
  const signature = await walletClient.signTypedData({
    account: owner,
    domain,
    types,
    primaryType: 'Permit',
    message,
  })

  // Parse the signature into v, r, s components
  const r = signature.slice(0, 66) as Hex
  const s = `0x${signature.slice(66, 130)}` as Hex
  const v = parseInt(signature.slice(130, 132), 16)

  return {
    v,
    r,
    s,
    deadline,
  }
}
