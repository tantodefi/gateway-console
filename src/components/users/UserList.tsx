import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useUsers } from '@/hooks/useUsers'
import { useXMTP, WALLET_USER_ID } from '@/contexts/XMTPContext'
import { UserCard } from './UserCard'
import { ConnectedWalletCard } from './ConnectedWalletCard'
import { AddUserDialog } from './AddUserDialog'
import { GatewayStatus } from '@/components/gateway'

export function UserList() {
  const { users, activeUser, activeUserId, createUser, deleteUser, selectUser } = useUsers()
  const { initializeClient, disconnect, activeUserId: xmtpActiveUserId, isConnecting } = useXMTP()
  const { isConnected: isWalletConnected } = useAccount()

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
              onSelect={() => selectUser(user.id)}
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
