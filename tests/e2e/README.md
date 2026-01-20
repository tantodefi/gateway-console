# E2E Tests with agent-browser

This directory contains end-to-end tests using [agent-browser](https://github.com/vercel-labs/agent-browser), a headless browser automation CLI designed for AI agents.

## Prerequisites

Install agent-browser globally:

```bash
npm install -g agent-browser
agent-browser install  # Downloads Chromium
```

## Running Tests

Start the dev server first:

```bash
npm run dev
```

Then run tests:

```bash
# Node.js test runner (recommended)
npm run test:e2e

# With verbose output
npm run test:e2e:verbose

# Shell script runner
npm run test:e2e:shell
```

### Run specific tests

```bash
# Node.js runner
node tests/e2e/test-runner.js --test page-load

# Shell runner
bash tests/e2e/run-tests.sh page-load
```

### Custom base URL

```bash
BASE_URL=http://localhost:3000 npm run test:e2e
node tests/e2e/test-runner.js --base-url http://localhost:3000
```

## Available Tests

| Test Name | Description |
|-----------|-------------|
| `page-load` | Verifies page loads with core UI elements |
| `interactive-elements` | Checks for accessible interactive elements |
| `desktop-viewport` | Tests desktop layout (1280x800) |
| `mobile-viewport` | Tests mobile layout (375x667) |
| `navigation-structure` | Verifies navigation elements exist |
| `accessibility-tree` | Checks for proper heading/landmark structure |
| `wallet-button` | Verifies wallet connection UI exists |

## Using agent-browser Interactively

You can use agent-browser directly for debugging or creating new tests:

```bash
# Open the app
agent-browser open http://localhost:5173 --session test

# Get interactive elements (best for AI agents)
agent-browser snapshot -i --session test

# Find specific elements
agent-browser find text "Connect Wallet" --session test

# Click an element by reference
agent-browser click @e1 --session test

# Take a screenshot
agent-browser screenshot --session test

# Close session
agent-browser close --session test
```

### Snapshot flags

- `-i` - Interactive elements only (buttons, links, inputs)
- `-c` - Compact mode (removes empty elements)
- `-d <n>` - Limit depth
- `-s <selector>` - CSS scope

## Writing New Tests

### Node.js (test-runner.js)

```javascript
const tests = {
  'my-new-test': {
    name: 'Description of test',
    run: async () => {
      ab(`open ${targetUrl}`)
      await sleep(2000)

      const snap = snapshot('-i')
      assert(snap.includes('expected-content'), 'Should have expected content')

      return true
    },
  },
}
```

### Shell (run-tests.sh)

```bash
test_my_new_test() {
    log_info "Testing: My new test..."

    agent-browser open "$BASE_URL" --session "$SESSION_NAME"
    sleep 2

    SNAPSHOT=$(agent-browser snapshot -i --session "$SESSION_NAME")

    if echo "$SNAPSHOT" | grep -q "expected-content"; then
        log_info "PASS: Found expected content"
    else
        log_error "FAIL: Expected content not found"
        return 1
    fi
}
```

## CI Integration

For CI environments, ensure:

1. agent-browser is installed: `npm install -g agent-browser`
2. Chromium is installed: `agent-browser install --with-deps`
3. Dev server is running before tests
4. Use `--json` flag for machine-readable output

Example CI workflow:

```yaml
- run: npm install -g agent-browser
- run: agent-browser install --with-deps
- run: npm run dev &
- run: sleep 5  # Wait for server
- run: npm run test:e2e
```
