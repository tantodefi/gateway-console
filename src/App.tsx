import { WalletButton } from '@/components/wallet'
import { UserList } from '@/components/users'
import { FaucetDialog } from '@/components/faucet'
import { DepositDialog } from '@/components/deposit'
import { BalanceDisplay } from '@/components/balance'
import {
  ConversationList,
  MessageThread,
  MessageInput,
  NewConversationDialog,
} from '@/components/messaging'
import { useXMTP } from '@/contexts/XMTPContext'

function App() {
  const { client } = useXMTP()

  return (
    <div className="min-h-screen flex">
      {/* User Sidebar */}
      <UserList />

      {/* Conversation Sidebar - only show when XMTP connected */}
      {client && (
        <div className="w-72 border-r flex flex-col bg-muted/30">
          <div className="p-3 border-b flex items-center justify-between">
            <NewConversationDialog />
          </div>
          <ConversationList />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Message With Tokens</h1>
          <div className="flex items-center gap-4">
            <BalanceDisplay />
            <WalletButton />
          </div>
        </header>

        {/* Content */}
        {client ? (
          <div className="flex-1 flex flex-col">
            <MessageThread />
            <MessageInput />
          </div>
        ) : (
          <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <p className="text-muted-foreground">
              Learn how XMTP messaging fees work
            </p>

            {/* Balance Display (when no client) */}
            <BalanceDisplay />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <FaucetDialog />
              <DepositDialog />
            </div>
          </main>
        )}
      </div>
    </div>
  )
}

export default App
