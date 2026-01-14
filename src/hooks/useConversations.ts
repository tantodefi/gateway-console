/**
 * Hooks for managing XMTP conversations and messages
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { Client, IdentifierKind, type Dm, type DecodedMessage } from '@xmtp/browser-sdk'
import { useXMTP } from '@/contexts/XMTPContext'

export interface ConversationData {
  id: string
  peerInboxId: string
  peerAddress: string | null
  lastMessage: string | null
  lastMessageTime: Date | null
  conversation: Dm
}

/**
 * Check if an address is reachable on XMTP
 */
export function useCanMessage() {
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const checkCanMessage = useCallback(async (address: string): Promise<boolean> => {
    setIsChecking(true)
    setError(null)

    try {
      const result = await Client.canMessage([
        { identifier: address.toLowerCase(), identifierKind: IdentifierKind.Ethereum }
      ])
      return result.get(address.toLowerCase()) ?? false
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to check reachability')
      setError(err)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  return { checkCanMessage, isChecking, error }
}

/**
 * Get inbox ID for an address
 */
export function useGetInboxId() {
  const { client } = useXMTP()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const getInboxId = useCallback(async (address: string): Promise<string | null> => {
    if (!client) {
      setError(new Error('XMTP client not initialized'))
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const inboxId = await client.fetchInboxIdByIdentifier({
        identifier: address.toLowerCase(),
        identifierKind: IdentifierKind.Ethereum,
      })
      return inboxId ?? null
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to get inbox ID')
      setError(err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [client])

  return { getInboxId, isLoading, error }
}

/**
 * List all DM conversations
 */
export function useConversations() {
  const { client } = useXMTP()
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadConversations = useCallback(async () => {
    if (!client) return

    setIsLoading(true)
    setError(null)

    try {
      // Sync conversations first
      await client.conversations.sync()

      // List all DMs
      const dms = await client.conversations.listDms()

      // Map to our data structure
      const convData: ConversationData[] = await Promise.all(
        dms.map(async (dm) => {
          // Get the peer's inbox ID (the other participant)
          const members = await dm.members()
          const peer = members.find(m => m.inboxId !== client.inboxId)

          // Get last message
          const messages = await dm.messages({ limit: 1n })
          const lastMsg = messages[0]

          return {
            id: dm.id,
            peerInboxId: peer?.inboxId ?? '',
            peerAddress: peer?.accountIdentifiers[0]?.identifier ?? null,
            lastMessage: lastMsg?.content as string ?? null,
            lastMessageTime: lastMsg?.sentAtNs ? new Date(Number(lastMsg.sentAtNs) / 1_000_000) : null,
            conversation: dm,
          }
        })
      )

      // Sort by last message time (newest first)
      convData.sort((a, b) => {
        if (!a.lastMessageTime) return 1
        if (!b.lastMessageTime) return -1
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
      })

      setConversations(convData)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to load conversations')
      console.error('Error loading conversations:', err)
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [client])

  // Load conversations when client changes
  useEffect(() => {
    if (client) {
      loadConversations()
    } else {
      setConversations([])
    }
  }, [client, loadConversations])

  return { conversations, isLoading, error, refresh: loadConversations }
}

/**
 * Create or find a DM conversation with an address
 */
export function useCreateDm() {
  const { client } = useXMTP()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createDm = useCallback(async (peerInboxId: string): Promise<Dm | null> => {
    if (!client) {
      setError(new Error('XMTP client not initialized'))
      return null
    }

    setIsCreating(true)
    setError(null)

    try {
      const dm = await client.conversations.createDm(peerInboxId)
      return dm
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to create DM')
      console.error('Error creating DM:', err)
      setError(err)
      return null
    } finally {
      setIsCreating(false)
    }
  }, [client])

  return { createDm, isCreating, error }
}

/**
 * Hook for messages in a specific conversation
 */
export function useMessages(conversation: Dm | null) {
  const [messages, setMessages] = useState<DecodedMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const streamRef = useRef<AsyncIterable<DecodedMessage> | null>(null)

  const loadMessages = useCallback(async () => {
    if (!conversation) {
      setMessages([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Sync conversation first
      await conversation.sync()

      // Load all messages
      const msgs = await conversation.messages()
      setMessages(msgs)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to load messages')
      console.error('Error loading messages:', err)
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [conversation])

  // Load messages and start streaming when conversation changes
  useEffect(() => {
    if (!conversation) {
      setMessages([])
      return
    }

    loadMessages()

    // Start streaming new messages
    const startStream = async () => {
      try {
        const stream = await conversation.stream()
        streamRef.current = stream

        for await (const message of stream) {
          setMessages(prev => [...prev, message])
        }
      } catch (e) {
        console.error('Message stream error:', e)
      }
    }

    startStream()

    // Cleanup stream on unmount or conversation change
    return () => {
      streamRef.current = null
    }
  }, [conversation, loadMessages])

  return { messages, isLoading, error, refresh: loadMessages }
}

/**
 * Send a message to a conversation
 */
export function useSendMessage() {
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sendMessage = useCallback(async (conversation: Dm, content: string): Promise<boolean> => {
    if (!conversation) {
      setError(new Error('No conversation selected'))
      return false
    }

    if (!content.trim()) {
      setError(new Error('Message cannot be empty'))
      return false
    }

    setIsSending(true)
    setError(null)

    try {
      await conversation.sendText(content)
      return true
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to send message')
      console.error('Error sending message:', err)
      setError(err)
      return false
    } finally {
      setIsSending(false)
    }
  }, [])

  return { sendMessage, isSending, error }
}
