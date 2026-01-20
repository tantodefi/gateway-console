/**
 * Mock Ethereum Wallet Provider for E2E Testing
 *
 * This script injects a mock wallet provider that simulates a connected wallet.
 * Use with agent-browser: agent-browser eval "$(cat tests/e2e/wallet-mock.js)"
 */

// Test wallet configuration - DO NOT use real funds on this address
const TEST_WALLET = {
  // This is a well-known test private key - NEVER use for real funds
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  chainId: 84532, // Base Sepolia
}

// Create mock ethereum provider
function createMockProvider() {
  const accounts = [TEST_WALLET.address]
  let chainId = TEST_WALLET.chainId

  const provider = {
    isMetaMask: true,
    isMockProvider: true,
    _testAddress: TEST_WALLET.address,

    request: async ({ method, params }) => {
      console.log('[MockWallet]', method, params)

      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return accounts

        case 'eth_chainId':
          return '0x' + chainId.toString(16)

        case 'net_version':
          return chainId.toString()

        case 'wallet_switchEthereumChain':
          const newChainId = parseInt(params[0].chainId, 16)
          chainId = newChainId
          provider.emit('chainChanged', '0x' + newChainId.toString(16))
          return null

        case 'wallet_addEthereumChain':
          return null

        case 'eth_getBalance':
          // Return 10 ETH in wei
          return '0x8AC7230489E80000'

        case 'eth_estimateGas':
          return '0x5208' // 21000

        case 'eth_gasPrice':
          return '0x3B9ACA00' // 1 gwei

        case 'eth_blockNumber':
          return '0x1'

        case 'eth_getBlockByNumber':
          return {
            number: '0x1',
            timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
            hash: '0x' + '0'.repeat(64),
          }

        case 'eth_call':
          // Return empty for most calls, specific values for known contracts
          return '0x'

        case 'personal_sign':
        case 'eth_sign':
        case 'eth_signTypedData':
        case 'eth_signTypedData_v4':
          // Return a mock signature
          return '0x' + '00'.repeat(65)

        case 'eth_sendTransaction':
          // Return a mock tx hash
          return '0x' + 'ab'.repeat(32)

        case 'eth_getTransactionReceipt':
          return {
            status: '0x1',
            blockNumber: '0x1',
            transactionHash: params[0],
          }

        default:
          console.warn('[MockWallet] Unhandled method:', method)
          return null
      }
    },

    on: (event, callback) => {
      provider._listeners = provider._listeners || {}
      provider._listeners[event] = provider._listeners[event] || []
      provider._listeners[event].push(callback)
    },

    removeListener: (event, callback) => {
      if (provider._listeners && provider._listeners[event]) {
        provider._listeners[event] = provider._listeners[event].filter(
          (cb) => cb !== callback
        )
      }
    },

    emit: (event, ...args) => {
      if (provider._listeners && provider._listeners[event]) {
        provider._listeners[event].forEach((cb) => cb(...args))
      }
    },
  }

  return provider
}

// Inject the mock provider
if (typeof window !== 'undefined') {
  const mockProvider = createMockProvider()

  // Override window.ethereum
  Object.defineProperty(window, 'ethereum', {
    value: mockProvider,
    writable: true,
    configurable: true,
  })

  // Also set as the default provider for EIP-6963
  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: {
          uuid: 'mock-wallet-uuid',
          name: 'Mock Test Wallet',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
          rdns: 'com.test.mockwallet',
        },
        provider: mockProvider,
      },
    })
  )

  console.log('[MockWallet] Injected successfully. Test address:', TEST_WALLET.address)

  // Export for debugging
  window.__mockWallet = {
    provider: mockProvider,
    address: TEST_WALLET.address,
    chainId: TEST_WALLET.chainId,
  }
}

// Return confirmation for agent-browser
'Mock wallet injected: ' + TEST_WALLET.address
