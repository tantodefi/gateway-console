import { WalletButton, UserBalance } from '@/components/wallet'
import { UserList } from '@/components/users'
import { FaucetDialog } from '@/components/faucet'
import { DepositDialog } from '@/components/deposit'
import { BalanceDisplay } from '@/components/balance'
import {
  ConversationList,
  MessageThread,
  MessageInput,
  NewConversationDialog,
  NewGroupDialog,
  RefreshConversationsButton,
} from '@/components/messaging'
import { useXMTP } from '@/contexts/XMTPContext'
import { APP_NAME } from '@/lib/constants'
import { ArrowDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function App() {
  const { client, isConnecting } = useXMTP()

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Gateway Console Header - spans full width */}
      <div className="relative px-4 py-2.5 bg-zinc-950 border-b border-zinc-800/50">
        <div className="flex items-center gap-2.5">
          <img src="/x-mark-red.svg" alt="XMTP" className="h-5 w-5" />
          <span className="text-xs font-mono font-medium uppercase tracking-widest text-zinc-100">
            Gateway Console
          </span>
          {APP_NAME && (
            <>
              <span className="text-zinc-600 text-xs">/</span>
              <span className="text-xs text-zinc-400">{APP_NAME}</span>
            </>
          )}
        </div>
        {/* Subtle accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-zinc-500/30 via-zinc-600/10 to-transparent" />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Developer Context - Left sidebar */}
        <div className="w-72 bg-zinc-950 flex flex-col">
          {/* Step 1: Fund App */}
          <div className="p-3 border-b border-zinc-800/50 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold ring-1 ring-zinc-600/50">1</span>
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Fund App
              </span>
            </div>

            {/* Connected Wallet Card */}
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/50 rounded-lg p-3 space-y-2 ring-1 ring-zinc-800/50">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Connected Wallet
              </div>
              <WalletButton />
              <UserBalance />
              <FaucetDialog />
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center py-1">
              <ArrowDown className="h-3.5 w-3.5 text-zinc-600" />
            </div>

            {/* Payer Wallet Card */}
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/50 rounded-lg p-3 space-y-2 ring-1 ring-zinc-800/50">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Payer Wallet
              </div>
              <BalanceDisplay />
              <DepositDialog />
            </div>
          </div>

          {/* Step 2: Test As User */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 pt-3">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold ring-1 ring-zinc-600/50">2</span>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Test As User
                </span>
              </div>
            </div>
            <UserList />
          </div>
        </div>

        {/* User Context - Main app area with rounded top-left corner */}
        <div className="flex-1 flex flex-col bg-background rounded-tl-xl overflow-hidden">
          {client ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Conversation Sidebar */}
              <div className="w-72 border-r flex flex-col">
                <div className="p-3 border-b flex items-center justify-between">
                  <h1 className="font-semibold">Conversations</h1>
                  <div className="flex items-center gap-1">
                    <RefreshConversationsButton />
                    <NewConversationDialog />
                    <NewGroupDialog />
                  </div>
                </div>
                <ConversationList />
              </div>

              {/* Message Area */}
              <div className="flex-1 flex flex-col">
                <MessageThread />
                <MessageInput />
              </div>
            </div>
          ) : isConnecting ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Conversation Sidebar Skeleton */}
              <div className="w-72 border-r flex flex-col">
                <div className="p-3 border-b flex items-center justify-between">
                  <Skeleton className="h-5 w-28" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
                <div className="flex-1 p-2 space-y-2">
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              </div>

              {/* Message Area Skeleton */}
              <div className="flex-1 flex flex-col">
                <div className="p-3 border-b">
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <Skeleton className="h-10 w-48 rounded-2xl" />
                  <Skeleton className="h-10 w-56 rounded-2xl ml-auto" />
                  <Skeleton className="h-10 w-40 rounded-2xl" />
                </div>
                <div className="p-3 border-t">
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </div>
          ) : (
            <main className="flex-1 flex flex-col items-center justify-center p-8">
              <p className="text-muted-foreground">
                Select a user to start messaging
              </p>
            </main>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
