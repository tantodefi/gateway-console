import { useEffect, useRef } from 'react'
import { useMessages } from '@/hooks/useConversations'
import { useMessaging } from '@/contexts/MessagingContext'
import { useXMTP } from '@/contexts/XMTPContext'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, MessageSquare, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DecodedMessage } from '@xmtp/browser-sdk'

function truncateAddress(address: string | null): string {
  if (!address) return 'Unknown'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function truncateInboxId(inboxId: string): string {
  return `${inboxId.slice(0, 6)}...${inboxId.slice(-4)}`
}

function formatMessageTime(nanos: bigint): string {
  const date = new Date(Number(nanos) / 1_000_000)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface MessageBubbleProps {
  message: DecodedMessage
  isOwn: boolean
  showSender?: boolean
}

function MessageBubble({ message, isOwn, showSender = false }: MessageBubbleProps) {
  const content = message.content as string

  return (
    <div
      className={cn(
        'flex flex-col max-w-[70%] gap-1',
        isOwn ? 'items-end ml-auto' : 'items-start mr-auto'
      )}
    >
      {showSender && !isOwn && (
        <span className="text-xs text-muted-foreground px-1 font-medium">
          {truncateInboxId(message.senderInboxId)}
        </span>
      )}
      <div
        className={cn(
          'px-3 py-2 rounded-2xl text-sm',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}
      >
        {content}
      </div>
      <span className="text-xs text-muted-foreground px-1">
        {formatMessageTime(message.sentAtNs)}
      </span>
    </div>
  )
}

export function MessageThread() {
  const { inboxId } = useXMTP()
  const { selectedConversation, conversationType, peerAddress, groupName } = useMessaging()
  const { messages, isLoading } = useMessages(selectedConversation)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isGroup = conversationType === 'group'

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
        <MessageSquare className="h-12 w-12" />
        <p className="text-sm">Select a conversation or start a new one</p>
      </div>
    )
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        {isGroup ? (
          <>
            <Users className="h-4 w-4 text-purple-500" />
            <span className="font-medium text-sm">
              {groupName || 'Unnamed Group'}
            </span>
          </>
        ) : (
          <>
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              {truncateAddress(peerAddress)}
            </span>
          </>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No messages yet. Send the first message!
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderInboxId === inboxId}
                showSender={isGroup}
              />
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
