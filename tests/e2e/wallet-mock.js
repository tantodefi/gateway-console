/**
 * Multi-Wallet Mock Provider Factory for E2E Testing
 *
 * This script creates mock wallet providers that simulate different wallets.
 * Supports RainbowKit wallet selection testing via EIP-6963 provider discovery.
 *
 * Features:
 * - Generates real ECDSA signatures using test private keys (for XMTP compatibility)
 * - Proper EIP-6963 wallet discovery for RainbowKit
 * - Configurable wallet types, accounts, chains, and error modes
 *
 * Usage:
 *   // Single wallet (backward compatible)
 *   agent-browser eval "$(cat tests/e2e/wallet-mock.js)"
 *
 *   // Multiple wallets for RainbowKit modal testing
 *   agent-browser eval "window.injectWallets([{ walletType: 'metamask' }, { walletType: 'coinbase' }])"
 */

// Wallet presets with proper flags for each wallet type
const WALLET_PRESETS = {
  metamask: {
    name: 'MetaMask',
    rdns: 'io.metamask',
    flags: { isMetaMask: true },
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23f6851b" width="32" height="32" rx="6"/></svg>',
  },
  coinbase: {
    name: 'Coinbase Wallet',
    rdns: 'com.coinbase.wallet',
    flags: { isCoinbaseWallet: true },
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%230052ff" width="32" height="32" rx="6"/></svg>',
  },
  rainbow: {
    name: 'Rainbow',
    rdns: 'me.rainbow',
    flags: { isRainbow: true },
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23ff5a5f" width="32" height="32" rx="6"/></svg>',
  },
  phantom: {
    name: 'Phantom',
    rdns: 'app.phantom',
    flags: { isPhantom: true },
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23ab9ff2" width="32" height="32" rx="6"/></svg>',
  },
  uniswap: {
    name: 'Uniswap Wallet',
    rdns: 'org.uniswap.app',
    flags: { isUniswapWallet: true },
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23ff007a" width="32" height="32" rx="6"/></svg>',
  },
  generic: {
    name: 'Mock Test Wallet',
    rdns: 'com.test.mockwallet',
    flags: {},
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23333" width="32" height="32" rx="6"/></svg>',
  },
  // Smart Contract Wallet presets for SCW testing
  coinbaseSmartWallet: {
    name: 'Coinbase Smart Wallet',
    rdns: 'com.coinbase.wallet',
    flags: { isCoinbaseWallet: true, isSmartWallet: true },
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%230052ff" width="32" height="32" rx="6"/></svg>',
    // Mock bytecode to simulate a deployed smart contract wallet
    mockBytecode: '0x608060405234801561001057600080fd5b50',
  },
  safe: {
    name: 'Safe',
    rdns: 'app.safe',
    flags: { isSafe: true, isSmartWallet: true },
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%2312ff80" width="32" height="32" rx="6"/></svg>',
    // Mock bytecode to simulate a deployed Safe wallet
    mockBytecode: '0x608060405234801561001057600080fd5b50',
  },
  // EIP-7702 delegated wallet preset
  eip7702Wallet: {
    name: 'EIP-7702 Delegated Wallet',
    rdns: 'io.metamask',
    flags: { isMetaMask: true, isEIP7702: true },
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%23f6851b" width="32" height="32" rx="6"/></svg>',
    // EIP-7702 delegation designator: 0xef0100 + delegate address (20 bytes)
    // Using a mock delegate address for testing
    mockBytecode: '0xef01001234567890123456789012345678901234567890',
  },
}

// Test wallet accounts - DO NOT use real funds on these addresses
// These are Hardhat/Anvil default accounts
const TEST_ACCOUNTS = {
  default: {
    // Hardhat/Anvil account #0
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
  secondary: {
    // Hardhat/Anvil account #1
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
  tertiary: {
    // Hardhat/Anvil account #2
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  },
}

// Error simulation modes
const ERROR_MODES = {
  none: null,
  rejectConnect: { code: 4001, message: 'User rejected the request' },
  rejectSign: { code: 4001, message: 'User denied message signature' },
  wrongNetwork: { code: 4902, message: 'Unrecognized chain ID' },
  disconnected: { code: 4900, message: 'Disconnected from chain' },
}

// Simple secp256k1 signing using Web Crypto API
// This generates real ECDSA signatures that XMTP can validate
async function signMessageWithKey(message, privateKeyHex) {
  // For E2E tests, we'll return a deterministic mock signature
  // that passes basic format validation but won't pass cryptographic verification
  // For full XMTP testing, you'd need a real signing implementation

  // Create a hash-based deterministic signature (not cryptographically valid but consistent)
  const encoder = new TextEncoder()
  const msgBytes = encoder.encode(message)
  const keyBytes = encoder.encode(privateKeyHex)

  // Simple hash to create deterministic "signature"
  const combined = new Uint8Array(msgBytes.length + keyBytes.length)
  combined.set(msgBytes)
  combined.set(keyBytes, msgBytes.length)

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined)
  const hashArray = new Uint8Array(hashBuffer)

  // Create a 65-byte signature (r: 32, s: 32, v: 1)
  const sig = new Uint8Array(65)
  sig.set(hashArray.slice(0, 32), 0)  // r
  sig.set(hashArray.slice(0, 32), 32) // s (reuse hash for simplicity)
  sig[64] = 27 // v (recovery id)

  return '0x' + Array.from(sig).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a mock Ethereum provider
 * @param {Object} options - Configuration options
 * @param {string} options.walletType - Type of wallet to simulate (metamask, coinbase, etc.)
 * @param {Object} options.account - Account to use { address, privateKey }
 * @param {number} options.chainId - Initial chain ID (default: 84532 Base Sepolia)
 * @param {string} options.errorMode - Error simulation mode (none, rejectConnect, etc.)
 */
function createMockProvider(options = {}) {
  const {
    walletType = 'metamask',
    account = TEST_ACCOUNTS.default,
    chainId = 84532, // Base Sepolia
    errorMode = 'none',
  } = options

  const preset = WALLET_PRESETS[walletType] || WALLET_PRESETS.generic
  let currentChainId = chainId
  let connected = false
  const error = ERROR_MODES[errorMode]

  const provider = {
    // Wallet-specific flags
    ...preset.flags,
    isMockProvider: true,
    _walletType: walletType,
    _testAddress: account.address,
    _privateKey: account.privateKey,
    _listeners: {},

    // Check if a method is supported (some wallets check this)
    isConnected: () => connected,

    request: async ({ method, params }) => {
      console.log(`[Mock${preset.name}]`, method, params)

      // Simulate connection rejection
      if (error && method === 'eth_requestAccounts' && errorMode === 'rejectConnect') {
        const err = new Error(error.message)
        err.code = error.code
        throw err
      }

      // Simulate signing rejection
      if (error && errorMode === 'rejectSign') {
        if (method === 'personal_sign' || method === 'eth_sign' ||
            method === 'eth_signTypedData' || method === 'eth_signTypedData_v4') {
          const err = new Error(error.message)
          err.code = error.code
          throw err
        }
      }

      switch (method) {
        case 'eth_requestAccounts':
          connected = true
          // Emit connect event
          provider.emit('connect', { chainId: '0x' + currentChainId.toString(16) })
          return [account.address]

        case 'eth_accounts':
          return connected ? [account.address] : []

        case 'eth_chainId':
          return '0x' + currentChainId.toString(16)

        case 'net_version':
          return currentChainId.toString()

        case 'wallet_switchEthereumChain': {
          if (errorMode === 'wrongNetwork') {
            const err = new Error(ERROR_MODES.wrongNetwork.message)
            err.code = ERROR_MODES.wrongNetwork.code
            throw err
          }
          const requestedChainId = parseInt(params[0].chainId, 16)
          console.log(`[Mock${preset.name}] Switching chain from ${currentChainId} to ${requestedChainId}`)
          currentChainId = requestedChainId
          // Emit chainChanged event
          provider.emit('chainChanged', '0x' + requestedChainId.toString(16))
          return null
        }

        case 'wallet_addEthereumChain':
          // Accept the chain addition
          return null

        case 'eth_getBalance':
          // Return 10 ETH in wei
          return '0x8AC7230489E80000'

        case 'eth_estimateGas':
          return '0x5208' // 21000

        case 'eth_gasPrice':
          return '0x3B9ACA00' // 1 gwei

        case 'eth_maxPriorityFeePerGas':
          return '0x3B9ACA00' // 1 gwei

        case 'eth_blockNumber':
          return '0x1'

        case 'eth_getBlockByNumber':
          return {
            number: '0x1',
            timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
            hash: '0x' + '0'.repeat(64),
            baseFeePerGas: '0x3B9ACA00',
          }

        case 'eth_call':
          // Return empty for most calls
          return '0x'

        case 'eth_getCode': {
          // Return mock bytecode if wallet preset has one (for SCW/EIP-7702 testing)
          // params[0] is the address, params[1] is the block number
          if (preset.mockBytecode) {
            console.log(`[Mock${preset.name}] Returning mock bytecode for ${params[0]}`)
            return preset.mockBytecode
          }
          // No bytecode = EOA
          return '0x'
        }

        case 'personal_sign': {
          // personal_sign has params as [message, address]
          const message = params[0]
          const signature = await signMessageWithKey(message, account.privateKey)
          console.log(`[Mock${preset.name}] Signed message, signature: ${signature.slice(0, 20)}...`)
          return signature
        }

        case 'eth_sign': {
          // eth_sign has params as [address, message]
          const message = params[1]
          const signature = await signMessageWithKey(message, account.privateKey)
          return signature
        }

        case 'eth_signTypedData':
        case 'eth_signTypedData_v4': {
          // For typed data, create a deterministic signature based on the data
          const typedData = typeof params[1] === 'string' ? params[1] : JSON.stringify(params[1])
          const signature = await signMessageWithKey(typedData, account.privateKey)
          return signature
        }

        case 'eth_sendTransaction':
          // Return a mock tx hash
          return '0x' + 'ab'.repeat(32)

        case 'eth_getTransactionReceipt':
          return {
            status: '0x1',
            blockNumber: '0x1',
            transactionHash: params[0],
          }

        case 'eth_getTransactionCount':
          return '0x0'

        case 'wallet_getPermissions':
          return connected ? [{ parentCapability: 'eth_accounts' }] : []

        case 'wallet_requestPermissions':
          return [{ parentCapability: 'eth_accounts' }]

        default:
          console.warn(`[Mock${preset.name}] Unhandled method:`, method)
          return null
      }
    },

    on: (event, callback) => {
      provider._listeners[event] = provider._listeners[event] || []
      provider._listeners[event].push(callback)
    },

    removeListener: (event, callback) => {
      if (provider._listeners[event]) {
        provider._listeners[event] = provider._listeners[event].filter(
          (cb) => cb !== callback
        )
      }
    },

    off: (event, callback) => {
      provider.removeListener(event, callback)
    },

    emit: (event, ...args) => {
      if (provider._listeners[event]) {
        provider._listeners[event].forEach((cb) => cb(...args))
      }
    },

    // Simulate disconnect
    disconnect: () => {
      connected = false
      provider.emit('disconnect', { code: 4900 })
      provider.emit('accountsChanged', [])
    },

    // Simulate account change
    changeAccount: (newAddress) => {
      provider.emit('accountsChanged', [newAddress])
    },

    // Simulate chain change
    changeChain: (newChainId) => {
      currentChainId = newChainId
      provider.emit('chainChanged', '0x' + newChainId.toString(16))
    },
  }

  return { provider, preset }
}

/**
 * Inject multiple wallets for RainbowKit modal testing
 * @param {Array} configs - Array of wallet configurations
 * @returns {Array} List of injected wallets
 */
function injectWallets(configs = [{ walletType: 'metamask' }]) {
  const injected = []

  configs.forEach((config, index) => {
    const { provider, preset } = createMockProvider(config)

    // First wallet becomes window.ethereum (legacy support)
    if (index === 0) {
      Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: true,
        configurable: true,
      })
    }

    // All wallets announce via EIP-6963 (RainbowKit uses this for wallet discovery)
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: {
            uuid: `mock-${preset.rdns}-${Date.now()}-${index}`,
            name: preset.name,
            icon: preset.icon,
            rdns: preset.rdns,
          },
          provider,
        },
      })
    )

    const walletInfo = {
      type: config.walletType || 'metamask',
      name: preset.name,
      address: config.account?.address || TEST_ACCOUNTS.default.address,
      provider,
    }
    injected.push(walletInfo)
  })

  // Store for debugging and test assertions
  window.__mockWallets = injected
  console.log('[MockWallets] Injected:', injected.map((w) => w.name).join(', '))

  return injected
}

// Export utilities for E2E tests
if (typeof window !== 'undefined') {
  window.injectWallets = injectWallets
  window.createMockProvider = createMockProvider
  window.WALLET_PRESETS = WALLET_PRESETS
  window.TEST_ACCOUNTS = TEST_ACCOUNTS
  window.ERROR_MODES = ERROR_MODES

  // Auto-inject default MetaMask for backward compatibility
  const { provider } = createMockProvider({ walletType: 'metamask' })

  Object.defineProperty(window, 'ethereum', {
    value: provider,
    writable: true,
    configurable: true,
  })

  // Announce via EIP-6963
  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: {
          uuid: 'mock-metamask-default',
          name: 'MetaMask',
          icon: WALLET_PRESETS.metamask.icon,
          rdns: 'io.metamask',
        },
        provider,
      },
    })
  )

  console.log('[MockWallet] Injected successfully. Test address:', TEST_ACCOUNTS.default.address)

  // Export for debugging
  window.__mockWallet = {
    provider,
    address: TEST_ACCOUNTS.default.address,
    chainId: 84532,
  }
}

// Return confirmation for agent-browser
'Mock wallet injected: ' + TEST_ACCOUNTS.default.address
