import { Send, ArrowDownToLine } from 'lucide-react'
import { usePayerBalance } from '@/hooks/usePayerBalance'
import { useXMTP } from '@/contexts/XMTPContext'
import { XMTPStatus } from '@/components/xmtp'

export function WelcomePanel() {
  const { error: xmtpError } = useXMTP()
  const { messagesAvailable } = usePayerBalance()

  if (xmtpError) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <XMTPStatus />
      </main>
    )
  }

  if (messagesAvailable === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-start gap-8 max-w-lg">
          {/* Left: Visual element */}
          <div className="shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-300 to-zinc-400 flex items-center justify-center ring-1 ring-zinc-400/50">
              <ArrowDownToLine className="h-8 w-8 text-zinc-600" />
            </div>
          </div>

          {/* Right: Text content */}
          <div className="flex flex-col gap-4 pt-2">
            <div className="space-y-1.5">
              <h3 className="text-base font-medium text-foreground">Fund your gateway to get started</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Deposit funds to your gateway wallet to start sending messages and see XMTP fees in action.
              </p>
            </div>

            {/* How to fund */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">How to fund</span>
              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-zinc-300 flex items-center justify-center text-[10px] font-mono text-zinc-600">1</span>
                  Get testnet tokens from the faucet
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-zinc-300 flex items-center justify-center text-[10px] font-mono text-zinc-600">2</span>
                  Deposit tokens to your gateway
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="flex items-start gap-8 max-w-lg">
        {/* Left: Visual element */}
        <div className="shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center ring-1 ring-zinc-700/50">
            <Send className="h-8 w-8 text-zinc-500" />
          </div>
        </div>

        {/* Right: Text content */}
        <div className="flex flex-col gap-4 pt-2">
          <div className="space-y-1.5">
            <h3 className="text-base font-medium text-foreground">Start a test conversation</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Select a user from the list to send messages and see how XMTP fees work on Base Sepolia testnet.
            </p>
          </div>

          {/* What you'll see */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">What you'll see</span>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                Per-message cost calculations
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                Storage + base fee breakdown
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                Real-time balance updates
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
