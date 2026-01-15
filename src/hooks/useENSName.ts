import { useState, useEffect, useRef } from 'react'
import { getENSProfile } from '@/lib/ens'
import type { Address } from 'viem'

// Simple in-memory cache for ENS profiles (name + avatar)
interface ENSProfile {
  name: string | null
  avatar: string | null
}
const ensCache = new Map<string, ENSProfile>()

/**
 * Hook to resolve ENS name and avatar for a single address
 */
export function useENSName(address: string | null): {
  ensName: string | null
  ensAvatar: string | null
  isLoading: boolean
} {
  const [profile, setProfile] = useState<ENSProfile>({ name: null, avatar: null })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!address) {
      setProfile({ name: null, avatar: null })
      return
    }

    const normalizedAddress = address.toLowerCase()

    // Check cache first
    if (ensCache.has(normalizedAddress)) {
      const cached = ensCache.get(normalizedAddress)!
      setProfile(cached)
      return
    }

    setIsLoading(true)

    getENSProfile(normalizedAddress as Address)
      .then((result) => {
        ensCache.set(normalizedAddress, result)
        setProfile(result)
      })
      .catch(() => {
        const empty = { name: null, avatar: null }
        ensCache.set(normalizedAddress, empty)
        setProfile(empty)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [address])

  return { ensName: profile.name, ensAvatar: profile.avatar, isLoading }
}

/**
 * Hook to resolve ENS names and avatars for multiple addresses
 * Returns the first address that has an ENS name, or null if none found
 */
export function useFirstENSName(addresses: string[]): {
  ensName: string | null
  ensAvatar: string | null
  address: string | null
  isLoading: boolean
} {
  const [result, setResult] = useState<{ ensName: string | null; ensAvatar: string | null; address: string | null }>({
    ensName: null,
    ensAvatar: null,
    address: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const requestIdRef = useRef(0)

  // Memoize the addresses key to prevent unnecessary re-renders
  const addressesKey = addresses.join(',')

  useEffect(() => {
    if (addresses.length === 0) {
      setResult({ ensName: null, ensAvatar: null, address: null })
      setIsLoading(false)
      return
    }

    const currentRequestId = ++requestIdRef.current

    // Check cache first for any cached ENS names
    for (const addr of addresses) {
      const normalizedAddr = addr.toLowerCase()
      if (ensCache.has(normalizedAddr)) {
        const cached = ensCache.get(normalizedAddr)!
        if (cached.name) {
          setResult({ ensName: cached.name, ensAvatar: cached.avatar, address: addr })
          setIsLoading(false)
          return
        }
      }
    }

    // Check if ALL addresses are cached (even if null)
    const allCached = addresses.every(addr => ensCache.has(addr.toLowerCase()))
    if (allCached) {
      // All cached but none have ENS names
      setResult({ ensName: null, ensAvatar: null, address: null })
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Resolve all addresses in parallel
    const resolveAll = async () => {
      const results = await Promise.all(
        addresses.map(async (addr) => {
          const normalizedAddr = addr.toLowerCase()

          // Check cache
          if (ensCache.has(normalizedAddr)) {
            const cached = ensCache.get(normalizedAddr)!
            return { address: addr, ensName: cached.name, ensAvatar: cached.avatar }
          }

          try {
            const profile = await getENSProfile(normalizedAddr as Address)
            ensCache.set(normalizedAddr, profile)
            return { address: addr, ensName: profile.name, ensAvatar: profile.avatar }
          } catch {
            const empty = { name: null, avatar: null }
            ensCache.set(normalizedAddr, empty)
            return { address: addr, ensName: null, ensAvatar: null }
          }
        })
      )

      // Ignore stale requests
      if (currentRequestId !== requestIdRef.current) return

      // Find first address with ENS name
      const firstWithENS = results.find((r) => r.ensName !== null)
      if (firstWithENS) {
        setResult({ ensName: firstWithENS.ensName, ensAvatar: firstWithENS.ensAvatar, address: firstWithENS.address })
      } else {
        setResult({ ensName: null, ensAvatar: null, address: null })
      }
      setIsLoading(false)
    }

    resolveAll()
  }, [addressesKey])

  return { ...result, isLoading }
}
