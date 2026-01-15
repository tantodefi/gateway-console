import { useAccount, useWalletClient, useEnsName, useEnsAvatar } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { Wallet } from 'lucide-react'
import { CopyableAddress } from '@/components/ui/copyable-address'
import { useXMTP, WALLET_USER_ID } from '@/contexts/XMTPContext'
import { useUsers } from '@/hooks/useUsers'

export function ConnectedWalletCard() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { initializeWithWallet, activeUserId, isConnecting } = useXMTP()
  const { selectUser } = useUsers()

  // Resolve ENS on mainnet regardless of connected chain
  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
  })
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: mainnet.id,
  })

  if (!isConnected || !address) {
    return null
  }

  const isActive = activeUserId === WALLET_USER_ID
  const isLoading = isConnecting && isActive
  const displayName = ensName ?? 'Connected Wallet'

  const handleSelect = async () => {
    if (!walletClient || isActive || isConnecting) return
    selectUser('') // Clear ephemeral selection immediately
    await initializeWithWallet(walletClient, address)
  }

  return (
    <div
      className={`group flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-zinc-800/80 ring-1 ring-zinc-500/40'
          : 'hover:bg-zinc-800/40'
      } ${isLoading ? 'opacity-70' : ''}`}
      onClick={handleSelect}
    >
      {/* Avatar - ENS avatar or fallback to wallet icon */}
      {ensAvatar ? (
        <img
          src={ensAvatar}
          alt={displayName}
          className="w-7 h-7 rounded-full flex-shrink-0 shadow-sm ring-1 ring-zinc-500/30 object-cover"
        />
      ) : (
        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-zinc-600 to-zinc-700 flex-shrink-0 shadow-sm ring-1 ring-zinc-500/30">
          <Wallet className="h-3.5 w-3.5 text-zinc-300" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col items-start">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-zinc-300 truncate">{displayName}</span>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-px rounded bg-zinc-700/50 text-zinc-400 ring-1 ring-zinc-600/50 flex-shrink-0">
            Connected
          </span>
        </div>
        <CopyableAddress address={address} className="text-[10px] text-zinc-600" />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )
}
