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
      // The gateway is a gRPC server (HTTP/2 binary protocol), not HTTP/1.1
      // Regular fetch() won't work, so we use WebSocket with timing detection
      // Connection refused fails fast (< 50ms), server responding with wrong protocol takes longer
      const wsUrl = GATEWAY_URL.replace(/^http/, 'ws')
      const startTime = performance.now()

      const connected = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 3000)
        const ws = new WebSocket(wsUrl)

        const handleResult = () => {
          clearTimeout(timeout)
          const elapsed = performance.now() - startTime
          // Connection refused typically fails in < 30ms
          // Protocol errors (server responding) take 50ms+ due to TCP handshake
          // Use 40ms threshold to distinguish
          resolve(elapsed > 40)
          try { ws.close() } catch { /* ignore */ }
        }

        ws.onopen = () => {
          clearTimeout(timeout)
          ws.close()
          resolve(true)
        }
        ws.onerror = handleResult
        ws.onclose = handleResult
      })

      setStatus(connected ? 'connected' : 'disconnected')
      setLastChecked(new Date())
    } catch {
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
