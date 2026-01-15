import { http, createConfig } from 'wagmi'
import { baseSepolia, mainnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import { SETTLEMENT_CHAIN_RPC_URL, MAINNET_RPC_URL } from './constants'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

export const config = createConfig({
  chains: [baseSepolia, mainnet],
  connectors: [
    injected(),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId })]
      : []),
  ],
  transports: {
    [baseSepolia.id]: http(SETTLEMENT_CHAIN_RPC_URL),
    [mainnet.id]: http(MAINNET_RPC_URL),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
