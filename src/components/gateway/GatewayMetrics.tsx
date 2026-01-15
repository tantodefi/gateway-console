import { BarChart3 } from 'lucide-react'

/**
 * Stub component for gateway usage metrics
 * TODO: Implement actual metrics from gateway service
 */
export function GatewayMetrics() {
  return (
    <div className="p-3 border-b border-zinc-800">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-3.5 w-3.5 text-zinc-600" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
          Usage
        </span>
      </div>

      <div className="bg-zinc-900 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Messages sent */}
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
              Messages
            </div>
            <div className="text-lg font-mono font-bold text-zinc-400 tabular-nums">
              —
            </div>
          </div>

          {/* Unique senders */}
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
              Senders
            </div>
            <div className="text-lg font-mono font-bold text-zinc-400 tabular-nums">
              —
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
              Total Spent
            </span>
            <span className="text-xs font-mono text-zinc-400 tabular-nums">
              — mUSD
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
