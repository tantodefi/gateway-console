import '@rainbow-me/rainbowkit/styles.css'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  baseAccount,
  walletConnectWallet,
  rainbowWallet,
  uniswapWallet,
  phantomWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http } from 'wagmi'
import { base, baseSepolia, mainnet } from 'wagmi/chains'
import { SETTLEMENT_CHAIN_RPC_URL, MAINNET_RPC_URL, BASE_MAINNET_RPC_URL } from './constants'
import { xmtpAppchain } from './chains'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

if (!walletConnectProjectId) {
  console.warn(
    'Missing VITE_WALLETCONNECT_PROJECT_ID environment variable. ' +
    'WalletConnect will be disabled. Get a free project ID at https://cloud.walletconnect.com'
  )
}

// Build wallet list - only include WalletConnect if project ID is configured
const popularWallets = [
  metaMaskWallet,
  baseAccount,
  uniswapWallet,
  rainbowWallet,
  phantomWallet,
]

const walletGroups = [
  {
    groupName: 'Popular',
    wallets: popularWallets,
  },
]

// Only add WalletConnect group if project ID is available
if (walletConnectProjectId) {
  walletGroups.push({
    groupName: 'More',
    wallets: [walletConnectWallet],
  })
}

const connectors = connectorsForWallets(
  walletGroups,
  {
    appName: 'XMTP Gateway Console',
    projectId: walletConnectProjectId || 'placeholder', // RainbowKit requires a projectId even if not using WalletConnect
  }
)

export const config = createConfig({
  connectors,
  chains: [base, baseSepolia, mainnet, xmtpAppchain],
  transports: {
    [baseSepolia.id]: http(SETTLEMENT_CHAIN_RPC_URL),
    [base.id]: http(BASE_MAINNET_RPC_URL),
    [mainnet.id]: http(MAINNET_RPC_URL),
    [xmtpAppchain.id]: http(xmtpAppchain.rpcUrls.default.http[0]),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
