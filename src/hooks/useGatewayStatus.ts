import { useState, useEffect, useCallback, useRef } from 'react'
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
  const consecutiveFailures = useRef(0)

  const checkGateway = useCallback(async (isBackgroundCheck = false) => {
    if (!GATEWAY_URL) {
      setStatus('unconfigured')
      return
    }

    // Show checking state unless this is a background re-check while already connected
    // (disconnected state should show spinner to indicate reconnection attempt)
    setStatus((current) =>
      isBackgroundCheck && current === 'connected' ? current : 'checking'
    )

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

      if (connected) {
        consecutiveFailures.current = 0
        setStatus('connected')
      } else {
        consecutiveFailures.current++
        // On background checks, require 2+ consecutive failures to avoid flaky UI
        // On initial/manual checks, show disconnected immediately
        if (!isBackgroundCheck || consecutiveFailures.current >= 2) {
          setStatus('disconnected')
        }
      }
      setLastChecked(new Date())
    } catch {
      consecutiveFailures.current++
      if (!isBackgroundCheck || consecutiveFailures.current >= 2) {
        setStatus('disconnected')
      }
      setLastChecked(new Date())
    }
  }, [])

  // Check on mount and periodically
  useEffect(() => {
    checkGateway()

    // Re-check every 30 seconds
    const interval = setInterval(() => checkGateway(true), 30_000)
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
