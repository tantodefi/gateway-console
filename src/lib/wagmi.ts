import { http, createConfig } from 'wagmi'
import { baseSepolia, mainnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

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
    [baseSepolia.id]: http(import.meta.env.VITE_SETTLEMENT_CHAIN_RPC_URL),
    [mainnet.id]: http(import.meta.env.VITE_MAINNET_RPC_URL),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
