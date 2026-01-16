import { useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useUsers } from '@/hooks/useUsers'
import { useXMTP, WALLET_USER_ID } from '@/contexts/XMTPContext'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { usePayerBalance } from '@/hooks/usePayerBalance'
import { UserCard } from './UserCard'
import { ConnectedWalletCard } from './ConnectedWalletCard'
import { AddUserDialog } from './AddUserDialog'
import { GatewayStatus } from '@/components/gateway'
import { AlertTriangle } from 'lucide-react'

export function UserList() {
  const { users, activeUser, activeUserId, createUser, deleteUser, selectUser } = useUsers()
  const { initializeClient, disconnect, activeUserId: xmtpActiveUserId, isConnecting } = useXMTP()
  const { isConnected: isWalletConnected } = useAccount()
  const { isMobile, showConversations } = useResponsiveLayout()
  const { balance, isLoading: isBalanceLoading } = usePayerBalance()
  const hasBalance = balance !== undefined && balance > 0n

  // Handle user selection - selects user and navigates to conversations on mobile
  const handleUserSelect = useCallback((userId: string) => {
    selectUser(userId)
    if (isMobile) {
      showConversations()
    }
  }, [selectUser, isMobile, showConversations])

  // Sync XMTP client with selected user
  // Wallet selection is handled by ConnectedWalletCard directly
  useEffect(() => {
    // Skip while connecting - wait for operation to complete
    if (isConnecting) return

    // User selected an ephemeral user that isn't currently active → switch to them
    if (activeUser && activeUser.id !== xmtpActiveUserId) {
      initializeClient(activeUser)
      return
    }

    // No user selected but an ephemeral client is still active → disconnect
    if (!activeUser && xmtpActiveUserId && xmtpActiveUserId !== WALLET_USER_ID) {
      disconnect()
    }
  }, [activeUser, xmtpActiveUserId, isConnecting, initializeClient, disconnect])

  // Show deposit required state when balance is 0
  if (!isBalanceLoading && !hasBalance) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 p-3 flex items-center justify-center">
          <div className="text-center space-y-3 max-w-[200px]">
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-amber-950/50 flex items-center justify-center ring-1 ring-amber-900/50">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-300">No Funds Available</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Deposit funds above to start testing messaging fees.
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 py-2.5 border-t border-zinc-800/50 bg-zinc-950/50">
          <GatewayStatus />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 p-3 space-y-1.5 overflow-auto">
        {/* Connected wallet always shows first when connected */}
        {isWalletConnected && <ConnectedWalletCard />}

        {/* Ephemeral test users */}
        {users.length === 0 && !isWalletConnected ? (
          <p className="text-xs text-zinc-500 font-mono py-2">
            No users yet
          </p>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isActive={user.id === activeUserId && xmtpActiveUserId !== WALLET_USER_ID}
              onSelect={() => handleUserSelect(user.id)}
              onDelete={() => deleteUser(user.id)}
            />
          ))
        )}
      </div>

      <div className="px-3 pb-3">
        <AddUserDialog onAddUser={createUser} />
      </div>

      <div className="px-3 py-2.5 border-t border-zinc-800/50 bg-zinc-950/50">
        <GatewayStatus />
      </div>
    </div>
  )
}
