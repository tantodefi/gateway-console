/**
 * Context for managing messaging state (selected conversation, etc.)
 */
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import type { Dm } from '@xmtp/browser-sdk'

interface MessagingContextValue {
  selectedConversation: Dm | null
  selectConversation: (conversation: Dm | null) => void
  peerAddress: string | null
  setPeerAddress: (address: string | null) => void
}

const MessagingContext = createContext<MessagingContextValue | null>(null)

interface MessagingProviderProps {
  children: ReactNode
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const [selectedConversation, setSelectedConversation] = useState<Dm | null>(null)
  const [peerAddress, setPeerAddress] = useState<string | null>(null)

  return (
    <MessagingContext.Provider
      value={{
        selectedConversation,
        selectConversation: setSelectedConversation,
        peerAddress,
        setPeerAddress,
      }}
    >
      {children}
    </MessagingContext.Provider>
  )
}

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider')
  }
  return context
}
