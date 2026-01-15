/**
 * Context for managing messaging state (selected conversation, etc.)
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { Conversation } from '@/hooks/useConversations'
import { useXMTP } from '@/contexts/XMTPContext'

interface MessagingContextValue {
  selectedConversation: Conversation | null
  selectConversation: (conversation: Conversation | null) => void
  conversationType: 'dm' | 'group' | null
  setConversationType: (type: 'dm' | 'group' | null) => void
  peerAddress: string | null
  setPeerAddress: (address: string | null) => void
  peerAddresses: string[]
  setPeerAddresses: (addresses: string[]) => void
  groupName: string | null
  setGroupName: (name: string | null) => void
}

const MessagingContext = createContext<MessagingContextValue | null>(null)

interface MessagingProviderProps {
  children: ReactNode
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const { client } = useXMTP()
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversationType, setConversationType] = useState<'dm' | 'group' | null>(null)
  const [peerAddress, setPeerAddress] = useState<string | null>(null)
  const [peerAddresses, setPeerAddresses] = useState<string[]>([])
  const [groupName, setGroupName] = useState<string | null>(null)

  // Clear selection when XMTP client changes (user switch)
  // The old conversation object becomes stale when client changes
  useEffect(() => {
    setSelectedConversation(null)
    setConversationType(null)
    setPeerAddress(null)
    setPeerAddresses([])
    setGroupName(null)
  }, [client])

  return (
    <MessagingContext.Provider
      value={{
        selectedConversation,
        selectConversation: setSelectedConversation,
        conversationType,
        setConversationType,
        peerAddress,
        setPeerAddress,
        peerAddresses,
        setPeerAddresses,
        groupName,
        setGroupName,
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
