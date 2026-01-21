import { useAccount, useEnsName } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { BookOpen } from 'lucide-react'
import { WalletButton, UserBalance } from '@/components/wallet'
import { UserList } from '@/components/users'
import { FaucetDialog } from '@/components/faucet'
import { DepositDialog } from '@/components/deposit'
import { BalanceDisplay } from '@/components/balance'
import {
  ConversationList,
  MessageThread,
  MessageInput,
  NewConversationDialog,
  NewGroupDialog,
  RefreshConversationsButton,
} from '@/components/messaging'
import { MobileHeader } from '@/components/layout'
import { useXMTP, WALLET_USER_ID } from '@/contexts/XMTPContext'
import { useMessaging } from '@/contexts/MessagingContext'
import { useUsers } from '@/hooks/useUsers'
import { useENSName } from '@/hooks/useENSName'
import { APP_NAME } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { WelcomePanel } from '@/components/welcome'
import { cn } from '@/lib/utils'

// Developer sidebar content - extracted for reuse in Sheet
function DeveloperSidebar() {
  return (
    <>
      {/* Explainer */}
      <div className="p-3 border-b border-zinc-800/50">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Connect your wallet to get testnet tokens and fund a gateway. Then send test messages to see fees in action.
        </p>
      </div>

      {/* Step 1: Get Tokens */}
      <div className="p-3 border-b border-zinc-800/50 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold ring-1 ring-zinc-600/50">1</span>
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Get Tokens
          </span>
        </div>

        {/* Your Wallet Card */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/50 rounded-lg p-3 space-y-2 ring-1 ring-zinc-800/50">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Your Wallet
          </div>
          <WalletButton />
          <UserBalance />
          <FaucetDialog />
        </div>
      </div>

      {/* Step 2: Deposit to Payer */}
      <div className="p-3 border-b border-zinc-800/50 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold ring-1 ring-zinc-600/50">2</span>
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Deposit Tokens
          </span>
        </div>

        {/* Payer Wallet Card */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/50 rounded-lg p-3 space-y-2 ring-1 ring-zinc-800/50">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            {APP_NAME || 'Payer Wallet'}
          </div>
          <BalanceDisplay />
          <DepositDialog />
        </div>
      </div>

      {/* Step 3: Test Messaging Fees */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 pt-3 pb-2 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold ring-1 ring-zinc-600/50">3</span>
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Test Messaging Fees
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 pl-7">Select a user</p>
        </div>
        <UserList />
      </div>
    </>
  )
}

// Helper to truncate address for display
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Main app content - uses responsive layout context
function AppContent() {
  const { client, isConnecting, activeUserId: xmtpActiveUserId } = useXMTP()
  const { activePanel, isMobile } = useResponsiveLayout()
  const { peerAddress, groupName, conversationType } = useMessaging()
  const { activeUser } = useUsers()
  const { address: walletAddress } = useAccount()

  // Resolve ENS name for DM conversations
  const { ensName: peerEnsName } = useENSName(peerAddress)

  // Resolve ENS name for connected wallet (same as ConnectedWalletCard)
  const { data: walletEnsName } = useEnsName({
    address: walletAddress,
    chainId: mainnet.id,
  })

  // Get the display name for the active user (who we're "viewing as")
  const getActiveUserDisplayName = (): string => {
    if (xmtpActiveUserId === WALLET_USER_ID) {
      if (walletEnsName) return walletEnsName
      if (walletAddress) return truncateAddress(walletAddress)
      return 'Connected Wallet'
    }
    if (activeUser) {
      return activeUser.name
    }
    return 'Messages'
  }

  // Compute mobile header title based on panel and conversation state
  const getMobileTitle = (): string => {
    // On conversations panel, show who we're viewing as
    if (activePanel === 'conversations') {
      return getActiveUserDisplayName()
    }
    // On chat panel, show the conversation name
    if (activePanel === 'chat') {
      if (conversationType === 'group' && groupName) return groupName
      if (conversationType === 'dm') {
        if (peerEnsName) return peerEnsName
        if (peerAddress) return truncateAddress(peerAddress)
      }
    }
    return 'Messages'
  }

  // Mobile sidebar panel - shows DeveloperSidebar as main screen on mobile
  // On mobile: full viewport width when activePanel is 'sidebar'
  // On desktop: never shown as standalone panel (desktop uses fixed sidebar)
  const sidebarPanelClasses = cn(
    "flex flex-col bg-zinc-950 w-full",
    // Mobile: toggle visibility based on activePanel
    activePanel === 'sidebar' ? 'flex' : 'hidden',
    // Desktop: never show as standalone panel
    "md:hidden"
  )

  // Helper to determine if conversation panel should be visible
  // On mobile: only when activePanel is 'conversations', takes full width
  // On desktop: always visible (md: breakpoint handles this via CSS)
  const conversationPanelClasses = cn(
    "flex flex-col border-r",
    // Mobile: toggle visibility based on activePanel, full width when visible
    activePanel === 'conversations' ? 'flex flex-1' : 'hidden',
    // Desktop: always show with fixed width, don't grow
    "md:flex md:flex-none md:w-72 md:shrink-0"
  )

  // Helper to determine if chat panel should be visible
  // On mobile: only when activePanel is 'chat'
  // On desktop: always visible
  const chatPanelClasses = cn(
    "flex flex-col",
    // Mobile: toggle visibility based on activePanel
    activePanel === 'chat' ? 'flex flex-1' : 'hidden',
    // Desktop: always show and take remaining space
    "md:flex md:flex-1"
  )

  // Only show header padding when not on sidebar (sidebar is full-screen)
  const showMobileHeaderPadding = isMobile && activePanel !== 'sidebar'

  return (
    <div
      className="min-h-screen flex flex-col bg-black"
      style={showMobileHeaderPadding ? { paddingTop: 'var(--mobile-header-height)' } : undefined}
    >
      {/* Mobile Header - only shown when NOT on sidebar panel */}
      {activePanel !== 'sidebar' && <MobileHeader title={getMobileTitle()} />}

      {/* Gateway Console Header - hidden on mobile, shown on desktop */}
      <div className="relative px-4 py-2.5 bg-zinc-950 border-b border-zinc-800/50 hidden md:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/x-mark-red.svg" alt="XMTP" className="h-5 w-5" />
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-zinc-100">
              Gateway Console
            </span>
            {APP_NAME && (
              <>
                <span className="text-zinc-600 text-xs">/</span>
                <span className="text-xs text-zinc-400">{APP_NAME}</span>
              </>
            )}
          </div>

          {/* Header Links */}
          <div className="flex items-center gap-2">
            <a
              href="https://docs.xmtp.org/fund-agents-apps/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded hover:bg-zinc-800/50"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Docs</span>
            </a>
            <div className="h-4 w-px bg-zinc-700" />
            <a
              href="https://github.com/xmtp/gateway-console"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded hover:bg-zinc-800/50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
        {/* Subtle accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-zinc-500/30 via-zinc-600/10 to-transparent" />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Mobile Sidebar Panel - full screen on mobile when activePanel is 'sidebar' */}
        <div className={sidebarPanelClasses}>
          {/* Mobile sidebar header */}
          <div className="relative px-4 py-3 border-b border-zinc-800/50" style={{ paddingTop: 'calc(var(--safe-area-inset-top) + 0.75rem)' }}>
            <div className="flex items-center gap-2.5">
              <img src="/x-mark-red.svg" alt="XMTP" className="h-5 w-5" />
              <span className="text-xs font-mono font-medium uppercase tracking-widest text-zinc-100">
                Gateway Console
              </span>
              {APP_NAME && (
                <>
                  <span className="text-zinc-600 text-xs">/</span>
                  <span className="text-xs text-zinc-400">{APP_NAME}</span>
                </>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-zinc-500/30 via-zinc-600/10 to-transparent" />
          </div>
          <DeveloperSidebar />
        </div>

        {/* Developer Context - Left sidebar (hidden on mobile, shown on desktop) */}
        <div className="hidden md:flex md:w-72 shrink-0 bg-zinc-950 flex-col">
          <DeveloperSidebar />
        </div>

        {/* User Context - Main app area with rounded top-left corner on desktop */}
        {/* Hidden on mobile when sidebar is active */}
        <div className={cn(
          "flex-1 flex flex-col bg-background overflow-hidden md:rounded-tl-xl",
          activePanel === 'sidebar' && "hidden md:flex"
        )}>
          {client ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Conversation Sidebar - responsive visibility */}
              <div className={conversationPanelClasses}>
                <div className="p-3 border-b flex items-center justify-between">
                  <h1 className="font-semibold">Conversations</h1>
                  <div className="flex items-center gap-1">
                    <RefreshConversationsButton />
                    <NewConversationDialog />
                    <NewGroupDialog />
                  </div>
                </div>
                <ConversationList />
              </div>

              {/* Message Area - responsive visibility */}
              <div className={chatPanelClasses}>
                <MessageThread />
                <MessageInput />
              </div>
            </div>
          ) : isConnecting ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Conversation Sidebar Skeleton - responsive */}
              <div className={conversationPanelClasses}>
                <div className="p-3 border-b flex items-center justify-between">
                  <Skeleton className="h-5 w-28" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
                <div className="flex-1 p-2 space-y-2">
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              </div>

              {/* Message Area Skeleton - responsive */}
              <div className={chatPanelClasses}>
                <div className="p-3 border-b">
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <Skeleton className="h-10 w-48 rounded-2xl" />
                  <Skeleton className="h-10 w-56 rounded-2xl ml-auto" />
                  <Skeleton className="h-10 w-40 rounded-2xl" />
                </div>
                <div className="p-3 border-t">
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </div>
          ) : (
            <WelcomePanel />
          )}
        </div>
      </div>
    </div>
  )
}

// App component - ResponsiveLayoutProvider is in main.tsx
function App() {
  return <AppContent />
}

export default App
