/**
 * ENS resolution utility for resolving ENS names to Ethereum addresses
 */
import { createPublicClient, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'
import type { Address } from 'viem'

// Create mainnet client for ENS resolution
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(import.meta.env.VITE_MAINNET_RPC_URL as string | undefined),
})

/**
 * Check if a string is a valid ENS name
 */
export function isENSName(name: string): boolean {
  return name.includes('.') && !isAddress(name)
}

/**
 * Resolve an ENS name to an Ethereum address
 * @param name - ENS name to resolve (e.g., "vitalik.eth")
 * @returns Resolved address or null if not found
 */
export async function resolveENS(name: string): Promise<Address | null> {
  try {
    const normalizedName = normalize(name)
    const address = await mainnetClient.getEnsAddress({ name: normalizedName })
    return address
  } catch (error) {
    console.error('ENS resolution error:', error)
    return null
  }
}

/**
 * Resolve an address or ENS name to an address
 * @param input - Ethereum address or ENS name
 * @returns Resolved address or null if invalid/not found
 */
export async function resolveAddressOrENS(input: string): Promise<Address | null> {
  const trimmed = input.trim().toLowerCase()

  // If it's already a valid address, return it
  if (isAddress(trimmed)) {
    return trimmed as Address
  }

  // If it looks like an ENS name, try to resolve it
  if (isENSName(trimmed)) {
    return resolveENS(trimmed)
  }

  return null
}

/**
 * Get ENS name for an address (reverse resolution)
 * @param address - Ethereum address
 * @returns ENS name or null if not found
 */
export async function getENSName(address: Address): Promise<string | null> {
  try {
    const name = await mainnetClient.getEnsName({ address })
    return name
  } catch (error) {
    console.error('ENS reverse resolution error:', error)
    return null
  }
}
