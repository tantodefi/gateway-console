import { useEffect } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { useXMTP } from '@/contexts'
import { UserCard } from './UserCard'
import { AddUserDialog } from './AddUserDialog'
import { XMTPStatus } from '@/components/xmtp'

export function UserList() {
  const { users, activeUser, activeUserId, createUser, deleteUser, selectUser } = useUsers()
  const { initializeClient, disconnect, activeUserId: xmtpActiveUserId } = useXMTP()

  // Initialize XMTP client when active user changes
  useEffect(() => {
    if (activeUser && activeUser.id !== xmtpActiveUserId) {
      initializeClient(activeUser)
    } else if (!activeUser && xmtpActiveUserId) {
      disconnect()
    }
  }, [activeUser, xmtpActiveUserId, initializeClient, disconnect])

  return (
    <div className="w-64 border-r h-full p-4 flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Users</h2>

      <div className="flex-1 space-y-2 overflow-auto">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No users yet. Create one to start messaging.
          </p>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isActive={user.id === activeUserId}
              onSelect={() => selectUser(user.id)}
              onDelete={() => deleteUser(user.id)}
            />
          ))
        )}
      </div>

      <AddUserDialog onAddUser={createUser} />

      <div className="pt-2 border-t">
        <XMTPStatus />
      </div>
    </div>
  )
}
