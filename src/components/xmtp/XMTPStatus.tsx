import { useXMTP } from '@/contexts'
import { Loader2, CheckCircle2, XCircle, Radio } from 'lucide-react'

export function XMTPStatus() {
  const { client, isConnecting, error, inboxId } = useXMTP()

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Connecting to XMTP...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <XCircle className="h-4 w-4" />
        <span title={error.message}>Connection failed</span>
      </div>
    )
  }

  if (client && inboxId) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span className="truncate" title={inboxId}>
          Connected
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Radio className="h-4 w-4" />
      <span>Select a user to connect</span>
    </div>
  )
}
