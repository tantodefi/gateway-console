import { useState, useEffect, useCallback, useRef } from 'react'
import { GATEWAY_URL } from '@/lib/constants'

export type GatewayStatus = 'connected' | 'disconnected' | 'checking'

/**
 * Hook to check if the XMTP gateway service is running
 * Does a simple connectivity check to the gateway URL
 */
export function useGatewayStatus() {
  const [status, setStatus] = useState<GatewayStatus>('checking')
  const consecutiveFailures = useRef(0)

  const checkGateway = useCallback(async (isBackgroundCheck = false) => {
    if (!GATEWAY_URL) {
      setStatus('disconnected')
      return
    }

    if (!isBackgroundCheck) {
      setStatus('checking')
    }

    try {
      // Simple connectivity check - any response means gateway is up
      // Even 4xx/5xx errors indicate the server is running
      await fetch(GATEWAY_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(3000),
      })
      consecutiveFailures.current = 0
      setStatus('connected')
    } catch (err) {
      // Check if it's a response error (server responded but with error) vs network error
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        // Network error - gateway not reachable
        consecutiveFailures.current++
        if (!isBackgroundCheck || consecutiveFailures.current >= 2) {
          setStatus('disconnected')
        }
      } else {
        // Got some response - gateway is up
        consecutiveFailures.current = 0
        setStatus('connected')
      }
    }
  }, [])

  // Check on mount and periodically
  useEffect(() => {
    checkGateway()
    const interval = setInterval(() => checkGateway(true), 30_000)
    return () => clearInterval(interval)
  }, [checkGateway])

  return {
    status,
    isConnected: status === 'connected',
    gatewayUrl: GATEWAY_URL,
    refresh: () => checkGateway(false),
  }
}
