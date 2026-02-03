import type { Address } from 'viem'

// Base Sepolia (Settlement Chain)
export const SETTLEMENT_CHAIN_ID = 84532

// Contract addresses from testnet-staging environment
export const CONTRACTS = {
  depositSplitter: '0x2E581B3d0baF840aD035ab74ACC781932E51c27e' as Address,
  nodeRegistry: '0xFac49258e9F06f321d992EFe1Ea289308002a1E4' as Address,
  payerRegistry: '0x208E94fbC9833B58765fedC30CFF8539C6356e88' as Address,
  rateRegistry: '0xA112D3E611a6a2F06F435FdE3B3912469cc6EE3f' as Address,
  settlementChainGateway: '0xB64D5bF62F30512Bd130C0D7c80DB7ac1e6801a3' as Address,
} as const

// Token addresses
export const TOKENS = {
  // Fee token (xUSD) - wrapped version
  feeToken: {
    address: '0x63C6667798fdA65E2E29228C43fbfDa0Cd4634A8' as Address,
    decimals: 6,
    symbol: 'xUSD',
    displaySymbol: 'mUSD',
  },
  // Underlying fee token (mUSD) - what users mint from faucet
  underlyingFeeToken: {
    address: '0x2d7e0534183dAD09008C97f230d9F4f6425eE859' as Address,
    decimals: 6,
    symbol: 'mUSD',
    displaySymbol: 'mUSD',
  },
} as const

// XMTP App Chain
export const XMTP_CHAIN_ID = 351243127

// XMTP Appchain RPC URL
export const XMTP_APPCHAIN_RPC_URL =
  import.meta.env.VITE_APP_CHAIN_RPC_URL || 'https://xmtp-testnet.g.alchemy.com/public'

// Appchain contract addresses (from funding portal testnet.json)
export const APPCHAIN_CONTRACTS = {
  appChainGateway: '0xB64D5bF62F30512Bd130C0D7c80DB7ac1e6801a3' as Address,
  groupMessageBroadcaster: '0x6619B1c95eb10d339903E4AA9938314d6E711d17' as Address,
  identityUpdateBroadcaster: '0xD49DCDd95Ce435eaB2E53DBfcBceF5cAAc78D95a' as Address,
} as const

// Gas reserve constants for deposit splitting
export const GAS_RESERVE_CONSTANTS = {
  // Default split: 25% to gas reserve, 75% to messaging
  defaultGasRatioPercent: 25n,
  // Minimum gas reserve: 0.01 xUSD (in 6 decimals = 10_000)
  minimumGasReserve: 10_000n,
  // Bridge gas parameters
  bridgeGasLimit: 200_000n,
  bridgeMaxFeePerGas: 2_000_000_000n,
} as const

// Gateway payer address - derived from PAYER_PRIVATE_KEY in gateway service
// This is where deposits are sent
export const GATEWAY_PAYER_ADDRESS = import.meta.env.VITE_GATEWAY_PAYER_ADDRESS as Address | undefined

// Default demo recipient
export const DEMO_RECIPIENT = 'hi.xmtp.eth'

// Fee calculation constants (in picodollars)
export const FEE_CONSTANTS = {
  // Base fee per message: ~$0.0000385
  messageFee: 38_500_000n,
  // Storage fee per byte per day: 22 picodollars
  storageFeePerBytePerDay: 22n,
  // Default storage duration in days
  defaultStorageDays: 60n,
  // Gas overhead multiplier (1.25x = 125/100)
  gasOverheadNumerator: 125n,
  gasOverheadDenominator: 100n,
  // Picodollars per dollar (10^12)
  picodollarsPerDollar: 1_000_000_000_000n,
} as const

// XMTP Network configuration
// 'dev' = direct connection to dev network (no gateway)
// 'testnet' = connect through gateway (uses 'dev' SDK env internally until testnet is supported)
export type XmtpNetwork = 'dev' | 'testnet'
export const XMTP_NETWORK: XmtpNetwork =
  (import.meta.env.VITE_XMTP_NETWORK as XmtpNetwork) || 'dev'

// Gateway configuration - only used when XMTP_NETWORK is 'testnet'
export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'https://localhost:5050'

// Helper to check if gateway should be used
export const USE_GATEWAY = XMTP_NETWORK === 'testnet'

export const APP_NAME = import.meta.env.VITE_APP_NAME as string | undefined
export const CONTRACTS_ENVIRONMENT = import.meta.env.VITE_CONTRACTS_ENVIRONMENT as string | undefined

// RPC URLs with sensible defaults
export const SETTLEMENT_CHAIN_RPC_URL =
  import.meta.env.VITE_SETTLEMENT_CHAIN_RPC_URL || 'https://sepolia.base.org'
export const MAINNET_RPC_URL =
  import.meta.env.VITE_MAINNET_RPC_URL || 'https://eth.llamarpc.com'

// =============================================================================
// AAVE V3 INTEGRATION - Base Sepolia Testnet
// =============================================================================

/**
 * Aave V3 Core Protocol Addresses on Base Sepolia
 * Source: https://github.com/bgd-labs/aave-address-book
 */
export const AAVE_V3 = {
  // Core lending pool - main entry point for supply/withdraw
  pool: '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27' as Address,
  // Pool addresses provider
  poolAddressesProvider: '0xE4C23309117Aa30342BFaae6c95c6478e0A4Ad00' as Address,
  // Pool data provider for reserve info
  poolDataProvider: '0xBc9f5b7E248451CdD7cA54e717a2BFe1F32b566b' as Address,
  // UI data provider
  uiPoolDataProvider: '0x6a9D64f93DB660EaCB2b6E9424792c630CdA87d8' as Address,
  // WETH Gateway for ETH deposits
  wethGateway: '0x0568130e794429D2eEBC4dafE18f25Ff1a1ed8b6' as Address,
} as const

/**
 * Supported assets for Aave V3 yield deposits on Base Sepolia
 */
export const AAVE_ASSETS = {
  USDC: {
    underlying: '0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f' as Address,
    aToken: '0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC' as Address,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  WETH: {
    underlying: '0x4200000000000000000000000000000000000006' as Address,
    aToken: '0x73a5bB60b0B0fc35710DDc0ea9c407031E31Bdbb' as Address,
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
  },
  USDT: {
    underlying: '0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a' as Address,
    aToken: '0xcE3CAae5Ed17A7AafCEEbc897DE843fA6CC0c018' as Address,
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
  },
} as const

export type AaveAssetKey = keyof typeof AAVE_ASSETS

/**
 * Yield deposit configuration
 */
export const YIELD_CONFIG = {
  // Minimum deposit amount in USD
  minimumDepositUsd: 100,
  // Mock swap rate: 1:1 for testnet (yield token to mUSD)
  mockSwapRate: 1n,
  // Estimated APY for yield calculations (3.5% as basis points)
  estimatedApyBps: 350,
  // Referral code for Aave (0 = no referral)
  referralCode: 0,
} as const
export const BASE_MAINNET_RPC_URL =
  import.meta.env.VITE_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org'

// localStorage keys
export const STORAGE_KEYS = {
  users: 'MWT_USERS',
  lastFaucetMint: 'MWT_LAST_FAUCET_MINT',
  activeUserId: 'MWT_ACTIVE_USER_ID',
} as const
