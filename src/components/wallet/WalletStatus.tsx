import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { Button } from '@/components/ui/button'

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function WalletStatus() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  if (!isConnected || !address) {
    return null
  }

  const isWrongNetwork = chainId !== baseSepolia.id

  return (
    <div className="flex items-center gap-3">
      {isWrongNetwork ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => switchChain({ chainId: baseSepolia.id })}
          disabled={isSwitching}
        >
          {isSwitching ? 'Switching...' : 'Switch to Base Sepolia'}
        </Button>
      ) : (
        <span className="text-xs bg-secondary px-2 py-1 rounded">
          Base Sepolia
        </span>
      )}
      <span className="font-mono text-sm">
        {truncateAddress(address)}
      </span>
      <Button variant="ghost" size="sm" onClick={() => disconnect()}>
        Disconnect
      </Button>
    </div>
  )
}
