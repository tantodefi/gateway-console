import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { Client, LogLevel } from '@xmtp/browser-sdk'
import { createEphemeralSigner } from '@/lib/xmtp-signer'
import type { EphemeralUser } from '@/types/user'

interface XMTPContextValue {
  client: Client | null
  activeUserId: string | null
  initializeClient: (user: EphemeralUser) => Promise<void>
  disconnect: () => Promise<void>
  isConnecting: boolean
  error: Error | null
  inboxId: string | null
}

const XMTPContext = createContext<XMTPContextValue | null>(null)

interface XMTPProviderProps {
  children: ReactNode
}

export function XMTPProvider({ children }: XMTPProviderProps) {
  const [client, setClient] = useState<Client | null>(null)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [inboxId, setInboxId] = useState<string | null>(null)

  // Track if we're in the middle of an operation to prevent concurrent calls
  const operationInProgress = useRef(false)

  const disconnect = useCallback(async () => {
    if (client) {
      try {
        // Close client connection
        await client.close()
      } catch (e) {
        console.warn('Error closing XMTP client:', e)
      }
    }
    setClient(null)
    setActiveUserId(null)
    setInboxId(null)
    setError(null)
  }, [client])

  const initializeClient = useCallback(async (user: EphemeralUser) => {
    // Prevent concurrent initialization
    if (operationInProgress.current) {
      console.warn('XMTP client operation already in progress')
      return
    }

    operationInProgress.current = true
    setIsConnecting(true)
    setError(null)

    try {
      // Close existing client if switching users
      if (client && activeUserId !== user.id) {
        try {
          await client.close()
        } catch (e) {
          console.warn('Error closing previous client:', e)
        }
        setClient(null)
        setActiveUserId(null)
        setInboxId(null)
      }

      // If same user and client exists, no need to reinitialize
      if (client && activeUserId === user.id) {
        setIsConnecting(false)
        operationInProgress.current = false
        return
      }

      // Create signer from user's private key
      const signer = createEphemeralSigner(user.privateKey)

      // Get gateway URL from environment
      const apiUrl = import.meta.env.VITE_GATEWAY_URL as string | undefined

      // Create new XMTP client
      // Use user.id for dbPath to ensure separate OPFS database per user
      const newClient = await Client.create(signer, {
        env: 'dev', // testnet environment
        ...(apiUrl && { apiUrl }),
        dbPath: `xmtp-mwt-${user.id}`, // Separate DB per user using UUID
        appVersion: 'message-with-tokens/0.1.0',
        loggingLevel: import.meta.env.DEV ? LogLevel.Debug : LogLevel.Warn,
      })

      setClient(newClient)
      setActiveUserId(user.id)
      setInboxId(newClient.inboxId ?? null)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to initialize XMTP client')
      console.error('XMTP initialization error:', err)
      setError(err)
      setClient(null)
      setActiveUserId(null)
      setInboxId(null)
    } finally {
      setIsConnecting(false)
      operationInProgress.current = false
    }
  }, [client, activeUserId])

  return (
    <XMTPContext.Provider
      value={{
        client,
        activeUserId,
        initializeClient,
        disconnect,
        isConnecting,
        error,
        inboxId,
      }}
    >
      {children}
    </XMTPContext.Provider>
  )
}

export function useXMTP() {
  const context = useContext(XMTPContext)
  if (!context) {
    throw new Error('useXMTP must be used within an XMTPProvider')
  }
  return context
}
