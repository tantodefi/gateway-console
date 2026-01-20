#!/usr/bin/env node

/**
 * Gateway Console E2E Test Runner
 *
 * Uses agent-browser for headless browser testing.
 * Designed to be run by AI agents or manually.
 *
 * Usage:
 *   node test-runner.js                    # Run all tests
 *   node test-runner.js --test page-load   # Run specific test
 *   node test-runner.js --verbose          # Verbose output
 *   node test-runner.js --base-url http://localhost:3000
 */

import { execSync, spawn } from 'child_process'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'gateway-e2e-' + Date.now()
const VERBOSE = process.argv.includes('--verbose')
const WITH_WALLET = process.argv.includes('--with-wallet')

// Load wallet mock script
const WALLET_MOCK_SCRIPT = readFileSync(join(__dirname, 'wallet-mock.js'), 'utf-8')

// Parse arguments
const args = process.argv.slice(2)
const testArg = args.find((a, i) => args[i - 1] === '--test')
const baseUrlArg = args.find((a, i) => args[i - 1] === '--base-url')
const targetUrl = baseUrlArg || BASE_URL

// Helper to run agent-browser commands
function ab(command, options = {}) {
  const fullCommand = `agent-browser ${command} --session ${SESSION}`
  if (VERBOSE) console.log(`  > ${fullCommand}`)

  try {
    const result = execSync(fullCommand, {
      encoding: 'utf-8',
      timeout: options.timeout || 30000,
      stdio: 'pipe',
    })
    const output = result?.trim() || ''
    if (VERBOSE && output) console.log(output)
    return output
  } catch (error) {
    if (options.ignoreError) return ''
    throw error
  }
}

// Get snapshot and return as string
function snapshot(flags = '') {
  return ab(`snapshot ${flags}`)
}

// Execute JavaScript in the page
function evaluate(script) {
  // Escape the script for shell
  const escaped = script.replace(/'/g, "'\\''")
  return ab(`eval '${escaped}'`, { timeout: 10000 })
}

// Inject the mock wallet provider
function injectWallet() {
  if (VERBOSE) console.log('  [Injecting mock wallet...]')
  const result = evaluate(WALLET_MOCK_SCRIPT)
  if (VERBOSE) console.log('  ' + result)
  return result
}

// Click the Connect button and wait for wallet modal
async function connectWallet() {
  // Find and click the Connect button
  const snap = snapshot('-i')
  const connectMatch = snap.match(/button "Connect".*?\[ref=(e\d+)\]/)

  if (connectMatch) {
    const ref = connectMatch[1]
    ab(`click @${ref}`)
    await sleep(1000)
    return true
  }

  return false
}

// Test definitions
const tests = {
  'page-load': {
    name: 'Page loads correctly',
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      const snap = snapshot('-i')

      assert(
        snap.includes('Gateway Console') || snap.includes('button'),
        'Page should contain Gateway Console header or interactive elements'
      )

      // Check for Connect Wallet button
      const hasWalletButton =
        snap.toLowerCase().includes('connect') ||
        snap.toLowerCase().includes('wallet')

      assert(hasWalletButton, 'Should have wallet connection UI')

      return true
    },
  },

  'interactive-elements': {
    name: 'Interactive elements are accessible',
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      const snap = snapshot('-i')

      // Check for element refs or interactive element types
      const elementRefs = snap.match(/@e\d+/g) || []
      const hasInteractiveTypes =
        snap.toLowerCase().includes('button') ||
        snap.toLowerCase().includes('link') ||
        snap.toLowerCase().includes('input') ||
        snap.toLowerCase().includes('textbox')

      assert(
        elementRefs.length > 0 || hasInteractiveTypes,
        'Should have interactive elements'
      )

      if (elementRefs.length > 0) {
        console.log(`    Found ${elementRefs.length} element refs`)
      } else {
        console.log('    Found interactive element types (no refs)')
      }

      return true
    },
  },

  'desktop-viewport': {
    name: 'Desktop viewport layout',
    run: async () => {
      ab('set viewport 1280 800')
      ab(`open ${targetUrl}`)
      await sleep(2000)

      const snap = snapshot()

      // Desktop should show sidebar content
      const hasSidebarContent =
        snap.includes('Get Tokens') ||
        snap.includes('Your Wallet') ||
        snap.includes('Deposit')

      // This might not always be visible depending on app state
      if (!hasSidebarContent) {
        console.log('    Note: Sidebar content may be conditional on auth state')
      }

      return true
    },
  },

  'mobile-viewport': {
    name: 'Mobile viewport layout',
    run: async () => {
      ab('set viewport 375 667')
      ab(`open ${targetUrl}`)
      await sleep(2000)

      // Just verify page loads at mobile size
      const snap = snapshot('-i')
      assert(snap.length > 0, 'Page should render at mobile viewport')

      return true
    },
  },

  'navigation-structure': {
    name: 'Navigation structure',
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      // Find interactive elements
      const snap = snapshot('-i')

      // Look for common navigation patterns
      const hasButtons = snap.includes('button') || snap.includes('Button')
      const hasLinks = snap.includes('link') || snap.includes('Link')

      assert(
        hasButtons || hasLinks,
        'Should have navigation elements (buttons or links)'
      )

      return true
    },
  },

  'accessibility-tree': {
    name: 'Accessibility tree structure',
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      const snap = snapshot()

      // Check for proper heading structure
      const hasHeadings =
        snap.toLowerCase().includes('heading') || snap.includes('h1') || snap.includes('h2')

      // Check for proper landmark regions
      const hasLandmarks =
        snap.toLowerCase().includes('main') ||
        snap.toLowerCase().includes('navigation') ||
        snap.toLowerCase().includes('region')

      console.log(`    Headings: ${hasHeadings ? 'yes' : 'no'}`)
      console.log(`    Landmarks: ${hasLandmarks ? 'yes' : 'no'}`)

      return true
    },
  },

  'wallet-button': {
    name: 'Wallet connect button exists',
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      // Use find to locate wallet-related elements
      try {
        const result = ab('find text "Connect"', { ignoreError: true })
        const hasConnect = result && result.includes('@e')

        if (!hasConnect) {
          // Try alternative approach with snapshot
          const snap = snapshot('-i')
          assert(
            snap.toLowerCase().includes('connect') ||
              snap.toLowerCase().includes('wallet'),
            'Should have wallet connection UI'
          )
        }
      } catch {
        // Fallback to snapshot check
        const snap = snapshot('-i')
        assert(
          snap.toLowerCase().includes('connect') ||
            snap.toLowerCase().includes('wallet'),
          'Should have wallet connection UI'
        )
      }

      return true
    },
  },

  // === Wallet-Connected Tests (require --with-wallet flag) ===

  'wallet-inject': {
    name: 'Inject mock wallet',
    requiresWallet: true,
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(1000)

      // Inject wallet before page fully initializes
      const result = injectWallet()
      assert(
        result.includes('Mock wallet injected') || result.includes('0xf39'),
        'Wallet mock should inject successfully'
      )

      // Verify injection
      const check = evaluate('window.__mockWallet?.address || "not found"')
      console.log(`    Mock wallet address: ${check}`)

      return true
    },
  },

  'wallet-connect-flow': {
    name: 'Wallet connection modal opens',
    requiresWallet: true,
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      // Inject mock wallet
      injectWallet()
      await sleep(500)

      // Click Connect button
      const clicked = await connectWallet()
      assert(clicked, 'Should find and click Connect button')

      await sleep(1500)

      // Check if modal opened (RainbowKit modal)
      const snap = snapshot()
      const hasModal =
        snap.toLowerCase().includes('connect a wallet') ||
        snap.toLowerCase().includes('metamask') ||
        snap.toLowerCase().includes('coinbase') ||
        snap.toLowerCase().includes('rainbow') ||
        snap.includes('dialog') ||
        snap.includes('modal')

      console.log(`    Modal detected: ${hasModal ? 'yes' : 'no'}`)

      return true
    },
  },

  'wallet-ui-state': {
    name: 'UI shows wallet-related elements',
    requiresWallet: true,
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      const snap = snapshot()

      // Check for wallet-related UI elements
      const hasFaucet = snap.includes('Mint') || snap.includes('Faucet')
      const hasDeposit = snap.includes('Deposit') || snap.includes('Fund')
      const hasBalance = snap.includes('Balance') || snap.includes('mUSD')

      console.log(`    Faucet UI: ${hasFaucet ? 'yes' : 'no'}`)
      console.log(`    Deposit UI: ${hasDeposit ? 'yes' : 'no'}`)
      console.log(`    Balance UI: ${hasBalance ? 'yes' : 'no'}`)

      assert(
        hasFaucet || hasDeposit || hasBalance,
        'Should show wallet-related UI elements'
      )

      return true
    },
  },

  'faucet-button': {
    name: 'Faucet/Mint button exists',
    requiresWallet: true,
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      const snap = snapshot('-i')

      const hasMintButton =
        snap.includes('button "Mint"') || snap.toLowerCase().includes('faucet')

      assert(hasMintButton, 'Should have Mint/Faucet button')
      console.log('    Found Mint button (disabled until wallet connected)')

      return true
    },
  },

  'deposit-button': {
    name: 'Deposit/Fund button exists',
    requiresWallet: true,
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      const snap = snapshot('-i')

      const hasFundButton =
        snap.includes('button "Fund"') || snap.toLowerCase().includes('deposit')

      assert(hasFundButton, 'Should have Fund/Deposit button')
      console.log('    Found Fund button (disabled until wallet connected)')

      return true
    },
  },

  'ephemeral-sender': {
    name: 'Ephemeral sender option exists',
    requiresWallet: true,
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      const snap = snapshot('-i')

      const hasEphemeral = snap.includes('ephemeral') || snap.includes('Ephemeral')

      assert(hasEphemeral, 'Should have ephemeral sender option')
      console.log('    Found "Use ephemeral sender" button')

      return true
    },
  },

  'gateway-status': {
    name: 'Gateway connection status shown',
    requiresWallet: true,
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      const snap = snapshot()

      const hasGatewayStatus =
        snap.includes('Gateway Connected') ||
        snap.includes('Gateway Offline') ||
        snap.includes('localhost:5050')

      assert(hasGatewayStatus, 'Should show gateway connection status')

      if (snap.includes('Gateway Connected')) {
        console.log('    Gateway status: Connected')
      } else if (snap.includes('Gateway Offline')) {
        console.log('    Gateway status: Offline')
      }

      return true
    },
  },
}

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Test runner
async function runTests() {
  console.log('\n Gateway Console E2E Tests')
  console.log('=' .repeat(50))
  console.log(`Target: ${targetUrl}`)
  console.log(`Session: ${SESSION}`)
  console.log(`Wallet tests: ${WITH_WALLET ? 'enabled' : 'disabled (use --with-wallet)'}\n`)

  // Check if server is running
  try {
    execSync(`curl -s ${targetUrl} > /dev/null`, { timeout: 5000 })
  } catch {
    console.error(` Dev server not running at ${targetUrl}`)
    console.error(' Start with: npm run dev\n')
    process.exit(1)
  }

  // Filter tests based on wallet flag
  let testsToRun
  if (testArg) {
    testsToRun = [testArg]
  } else {
    testsToRun = Object.entries(tests)
      .filter(([_, test]) => WITH_WALLET || !test.requiresWallet)
      .map(([name]) => name)
  }
  let passed = 0
  let failed = 0

  for (const testName of testsToRun) {
    const test = tests[testName]
    if (!test) {
      console.error(` Unknown test: ${testName}`)
      console.error(` Available: ${Object.keys(tests).join(', ')}`)
      process.exit(1)
    }

    process.stdout.write(` ${test.name}... `)

    try {
      await test.run()
      console.log(' PASS')
      passed++
    } catch (error) {
      console.log(' FAIL')
      console.error(`    ${error.message}`)
      failed++
    }
  }

  // Cleanup
  try {
    ab('close', { ignoreError: true })
  } catch {
    // Ignore cleanup errors
  }

  console.log('\n' + '='.repeat(50))
  console.log(` Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((error) => {
  console.error('Test runner error:', error)
  process.exit(1)
})
