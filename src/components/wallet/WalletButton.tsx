import { useAccount } from 'wagmi'
import { ConnectWallet } from './ConnectWallet'
import { WalletStatus } from './WalletStatus'

export function WalletButton() {
  const { isConnected } = useAccount()

  if (isConnected) {
    return <WalletStatus />
  }

  return <ConnectWallet />
}
