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
      // Use /health endpoint which returns 200 OK from Envoy directly
      const healthUrl = GATEWAY_URL.replace(/\/$/, '') + '/health'
      await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })
      consecutiveFailures.current = 0
      setStatus('connected')
    } catch {
      // Any error means gateway is not reachable (network error, timeout, CORS, etc.)
      // Note: fetch() only throws on network failures, not HTTP error responses (4xx/5xx)
      consecutiveFailures.current++
      if (!isBackgroundCheck || consecutiveFailures.current >= 2) {
        setStatus('disconnected')
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
