import { useState, useEffect, useCallback } from 'react'
import { GATEWAY_URL } from '@/lib/constants'

export type GatewayStatus = 'connected' | 'disconnected' | 'checking' | 'unconfigured'

/**
 * Hook to check if the XMTP gateway service is running
 * Pings the gateway URL periodically to determine connectivity
 */
export function useGatewayStatus() {
  const [status, setStatus] = useState<GatewayStatus>(
    GATEWAY_URL ? 'checking' : 'unconfigured'
  )
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkGateway = useCallback(async () => {
    if (!GATEWAY_URL) {
      setStatus('unconfigured')
      return
    }

    setStatus('checking')

    try {
      // Try to fetch the gateway root - any response indicates it's running
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      await fetch(GATEWAY_URL, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors', // Gateway may not have CORS configured
      })

      clearTimeout(timeoutId)

      // In no-cors mode, we can't read the response, but if we get here
      // without an error, the server responded
      setStatus('connected')
      setLastChecked(new Date())
    } catch (error) {
      // Network error or timeout means gateway is not reachable
      setStatus('disconnected')
      setLastChecked(new Date())
    }
  }, [])

  // Check on mount and periodically
  useEffect(() => {
    checkGateway()

    // Check every 30 seconds
    const interval = setInterval(checkGateway, 30_000)
    return () => clearInterval(interval)
  }, [checkGateway])

  return {
    status,
    isConnected: status === 'connected',
    isConfigured: status !== 'unconfigured',
    lastChecked,
    refresh: checkGateway,
    gatewayUrl: GATEWAY_URL,
  }
}
