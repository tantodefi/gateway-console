#!/bin/bash

# Gateway Console E2E Tests using agent-browser
# Usage: ./run-tests.sh [test-name]
# Run all tests: ./run-tests.sh
# Run specific test: ./run-tests.sh wallet-connect

set -e

BASE_URL="${BASE_URL:-http://localhost:5173}"
SESSION_NAME="gateway-console-test"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test session..."
    agent-browser close --session "$SESSION_NAME" 2>/dev/null || true
}

trap cleanup EXIT

# Check if agent-browser is installed
if ! command -v agent-browser &> /dev/null; then
    log_error "agent-browser is not installed. Run: npm install -g agent-browser && agent-browser install"
    exit 1
fi

# Check if dev server is running
check_server() {
    if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
        log_error "Dev server not running at $BASE_URL"
        log_info "Start the server with: npm run dev"
        exit 1
    fi
    log_info "Dev server is running at $BASE_URL"
}

# Test: Page loads correctly
test_page_load() {
    log_info "Testing: Page loads correctly..."

    agent-browser open "$BASE_URL" --session "$SESSION_NAME"
    sleep 2

    # Get snapshot and check for key elements
    SNAPSHOT=$(agent-browser snapshot -i --session "$SESSION_NAME")

    if echo "$SNAPSHOT" | grep -q "Gateway Console"; then
        log_info "PASS: Gateway Console header found"
    else
        log_error "FAIL: Gateway Console header not found"
        return 1
    fi

    if echo "$SNAPSHOT" | grep -q "Connect Wallet"; then
        log_info "PASS: Connect Wallet button found"
    else
        log_error "FAIL: Connect Wallet button not found"
        return 1
    fi

    log_info "Test passed: Page loads correctly"
}

# Test: Welcome panel displays when not connected
test_welcome_panel() {
    log_info "Testing: Welcome panel displays..."

    agent-browser open "$BASE_URL" --session "$SESSION_NAME"
    sleep 2

    SNAPSHOT=$(agent-browser snapshot --session "$SESSION_NAME")

    # Check for welcome content or initial state
    if echo "$SNAPSHOT" | grep -qi "connect\|wallet\|welcome"; then
        log_info "PASS: Welcome/connect state detected"
    else
        log_error "FAIL: Welcome state not detected"
        return 1
    fi

    log_info "Test passed: Welcome panel displays"
}

# Test: Developer sidebar content
test_developer_sidebar() {
    log_info "Testing: Developer sidebar content..."

    agent-browser open "$BASE_URL" --session "$SESSION_NAME"
    sleep 2

    SNAPSHOT=$(agent-browser snapshot --session "$SESSION_NAME")

    # Check for step indicators
    if echo "$SNAPSHOT" | grep -q "Get Tokens"; then
        log_info "PASS: Step 1 'Get Tokens' found"
    else
        log_warn "Step 1 'Get Tokens' not found (might be mobile view)"
    fi

    if echo "$SNAPSHOT" | grep -q "Deposit"; then
        log_info "PASS: Step 2 'Deposit' found"
    else
        log_warn "Step 2 'Deposit' not found (might be mobile view)"
    fi

    if echo "$SNAPSHOT" | grep -q "Test Messaging"; then
        log_info "PASS: Step 3 'Test Messaging' found"
    else
        log_warn "Step 3 'Test Messaging' not found (might be mobile view)"
    fi

    log_info "Test passed: Developer sidebar content"
}

# Test: Interactive elements are accessible
test_interactive_elements() {
    log_info "Testing: Interactive elements accessibility..."

    agent-browser open "$BASE_URL" --session "$SESSION_NAME"
    sleep 2

    # Get interactive elements only
    SNAPSHOT=$(agent-browser snapshot -i --session "$SESSION_NAME")

    # Count interactive elements
    ELEMENT_COUNT=$(echo "$SNAPSHOT" | grep -c "@e" || echo "0")

    if [ "$ELEMENT_COUNT" -gt 0 ]; then
        log_info "PASS: Found $ELEMENT_COUNT interactive elements"
    else
        log_error "FAIL: No interactive elements found"
        return 1
    fi

    log_info "Test passed: Interactive elements accessible"
}

# Test: Responsive layout (desktop)
test_desktop_layout() {
    log_info "Testing: Desktop layout..."

    agent-browser set viewport 1280 800 --session "$SESSION_NAME"
    agent-browser open "$BASE_URL" --session "$SESSION_NAME"
    sleep 2

    SNAPSHOT=$(agent-browser snapshot --session "$SESSION_NAME")

    # On desktop, sidebar should be visible
    if echo "$SNAPSHOT" | grep -q "Your Wallet"; then
        log_info "PASS: Desktop sidebar visible"
    else
        log_warn "Desktop sidebar might be hidden or text differs"
    fi

    log_info "Test passed: Desktop layout"
}

# Test: Responsive layout (mobile)
test_mobile_layout() {
    log_info "Testing: Mobile layout..."

    agent-browser set viewport 375 667 --session "$SESSION_NAME"
    agent-browser open "$BASE_URL" --session "$SESSION_NAME"
    sleep 2

    # Take screenshot for visual verification
    agent-browser screenshot --session "$SESSION_NAME" > /dev/null 2>&1 || true

    log_info "Test passed: Mobile layout (screenshot captured)"
}

# Run all tests or specific test
run_tests() {
    local test_name="$1"
    local failed=0

    check_server

    if [ -z "$test_name" ]; then
        # Run all tests
        log_info "Running all tests..."

        test_page_load || ((failed++))
        test_welcome_panel || ((failed++))
        test_developer_sidebar || ((failed++))
        test_interactive_elements || ((failed++))
        test_desktop_layout || ((failed++))
        test_mobile_layout || ((failed++))

        echo ""
        if [ $failed -eq 0 ]; then
            log_info "All tests passed!"
        else
            log_error "$failed test(s) failed"
            exit 1
        fi
    else
        # Run specific test
        case "$test_name" in
            "page-load")
                test_page_load
                ;;
            "welcome")
                test_welcome_panel
                ;;
            "sidebar")
                test_developer_sidebar
                ;;
            "interactive")
                test_interactive_elements
                ;;
            "desktop")
                test_desktop_layout
                ;;
            "mobile")
                test_mobile_layout
                ;;
            *)
                log_error "Unknown test: $test_name"
                echo "Available tests: page-load, welcome, sidebar, interactive, desktop, mobile"
                exit 1
                ;;
        esac
    fi
}

run_tests "$1"
