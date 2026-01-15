import { useEffect, useMemo, useRef, useState } from 'react'
import { useMessages, useGroupAdmin } from '@/hooks/useConversations'
import { useMessaging } from '@/contexts/MessagingContext'
import { useXMTP } from '@/contexts/XMTPContext'
import { useFirstENSName } from '@/hooks/useENSName'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, MessageSquare, User, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DecodedMessage, Group } from '@xmtp/browser-sdk'
import { GroupSettingsDialog } from './GroupSettingsDialog'

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
  senderName?: string
  memberNames?: Map<string, string>
}

// Type for GroupUpdated content
interface GroupUpdatedContent {
  initiatedByInboxId?: string
  metadataFieldChanges?: Array<{
    fieldName: string
    oldValue: string
    newValue: string
  }>
  addedInboxes?: Array<{ inboxId: string }>
  removedInboxes?: Array<{ inboxId: string }>
}

/**
 * Format a group update message into human-readable text
 * @param content - The group update content
 * @param memberNames - Optional map from inbox ID to display name (address)
 */
function formatGroupUpdate(
  content: GroupUpdatedContent,
  memberNames?: Map<string, string>
): string {
  const parts: string[] = []

  // Helper to resolve inbox ID to display name
  const resolveName = (inboxId: string) =>
    memberNames?.get(inboxId) || truncateInboxId(inboxId)

  // Handle metadata changes (name, description, etc.)
  if (content.metadataFieldChanges?.length) {
    for (const change of content.metadataFieldChanges) {
      if (change.fieldName === 'group_name') {
        if (change.oldValue && change.newValue) {
          parts.push(`Group renamed to "${change.newValue}"`)
        } else if (change.newValue) {
          parts.push(`Group name set to "${change.newValue}"`)
        }
      } else if (change.fieldName === 'group_description') {
        parts.push('Group description updated')
      } else if (change.fieldName === 'group_image_url_square') {
        parts.push('Group image updated')
      } else {
        parts.push(`${change.fieldName} updated`)
      }
    }
  }

  // Handle member additions - list who was added
  if (content.addedInboxes?.length) {
    const names = content.addedInboxes.map(m => resolveName(m.inboxId)).join(', ')
    parts.push(`Added: ${names}`)
  }

  // Handle member removals - list who was removed
  if (content.removedInboxes?.length) {
    const names = content.removedInboxes.map(m => resolveName(m.inboxId)).join(', ')
    parts.push(`Removed: ${names}`)
  }

  return parts.length > 0 ? parts.join(' · ') : 'Group updated'
}

function MessageBubble({ message, isOwn, showSender = false, senderName, memberNames }: MessageBubbleProps) {
  // XMTP messages can have different content types
  // Only render text messages - skip system messages like GroupUpdated
  const content = message.content
  const isGroup = showSender // showSender is true for groups, false for DMs

  // Handle non-text content types (GroupUpdated, etc.)
  if (typeof content !== 'string') {
    // Check if it's a group update message
    if (content && typeof content === 'object' && 'initiatedByInboxId' in content) {
      // Skip group updates in DMs - membership is fixed
      if (!isGroup) return null

      const updateText = formatGroupUpdate(content as GroupUpdatedContent, memberNames)
      return (
        <div className="flex justify-center py-2">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {updateText}
          </span>
        </div>
      )
    }
    // Skip other non-text content types
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-col max-w-[70%] gap-1',
        isOwn ? 'items-end ml-auto' : 'items-start mr-auto'
      )}
    >
      {showSender && !isOwn && (
        <span className="text-xs text-muted-foreground px-1 font-medium">
          {senderName || truncateInboxId(message.senderInboxId)}
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
  const { selectedConversation, conversationType, peerAddresses, groupName } = useMessaging()
  const { messages, isLoading } = useMessages(selectedConversation)
  const { ensName, ensAvatar } = useFirstENSName(peerAddresses)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isGroup = conversationType === 'group'

  // Get group members to resolve sender names from inbox IDs to addresses
  const { members } = useGroupAdmin(isGroup ? (selectedConversation as Group) : null)

  // Create a lookup map from inbox ID to display name (address)
  const memberDisplayNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const member of members) {
      const displayName = member.addresses[0]
        ? truncateAddress(member.addresses[0])
        : truncateInboxId(member.inboxId)
      map.set(member.inboxId, displayName)
    }
    return map
  }, [members])

  // Format display name for DMs - prefer ENS, fall back to truncated address
  const formatDisplayName = () => {
    if (ensName) return ensName
    if (peerAddresses.length === 0) return 'Unknown'
    return truncateAddress(peerAddresses[0])
  }

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

  if (selectedConversation && isLoading && messages.length === 0) {
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
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-purple-500/10">
              <Users className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <span className="font-medium text-sm flex-1">
              {groupName || 'Unnamed Group'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="h-7 text-xs"
            >
              <Settings className="h-3.5 w-3.5 mr-1" />
              Manage
            </Button>
          </>
        ) : (
          <>
            {ensAvatar ? (
              <img
                src={ensAvatar}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/10">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <span className="font-medium text-sm">
              {formatDisplayName()}
            </span>
          </>
        )}
      </div>

      {/* Group Settings Dialog */}
      {isGroup && (
        <GroupSettingsDialog
          group={selectedConversation as Group}
          groupName={groupName}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}

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
                senderName={memberDisplayNames.get(msg.senderInboxId)}
                memberNames={memberDisplayNames}
              />
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
