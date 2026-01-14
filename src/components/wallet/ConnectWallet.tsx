import { useConnect } from 'wagmi'
import { Button } from '@/components/ui/button'

export function ConnectWallet() {
  const { connect, connectors, isPending } = useConnect()

  // Find injected (MetaMask) and WalletConnect connectors
  const injectedConnector = connectors.find(c => c.id === 'injected')
  const walletConnectConnector = connectors.find(c => c.id === 'walletConnect')

  return (
    <div className="flex gap-2">
      {injectedConnector && (
        <Button
          onClick={() => connect({ connector: injectedConnector })}
          disabled={isPending}
        >
          {isPending ? 'Connecting...' : 'MetaMask'}
        </Button>
      )}
      {walletConnectConnector && (
        <Button
          variant="outline"
          onClick={() => connect({ connector: walletConnectConnector })}
          disabled={isPending}
        >
          WalletConnect
        </Button>
      )}
      {!injectedConnector && !walletConnectConnector && (
        <Button disabled>No Wallet Found</Button>
      )}
    </div>
  )
}
