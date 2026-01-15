import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { useMediaQuery } from "@mantine/hooks"

// Mobile breakpoint - matches Tailwind's md: breakpoint
const MOBILE_BREAKPOINT = "(max-width: 767px)"

/**
 * Returns true when viewport is less than 768px (mobile)
 * Defaults to false (desktop) on initial render for consistency
 */
export function useIsMobile(): boolean {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT, false, { getInitialValueInEffect: true })
  return isMobile ?? false
}

// Panel types for mobile navigation
export type ActivePanel = "conversations" | "chat" | "settings"

// History state shape for browser navigation
interface HistoryState {
  panel: ActivePanel
  topic: string | null
}

// Internal state for tracking panel navigation
interface ResponsiveLayoutState {
  activePanel: ActivePanel
  selectedConversationTopic: string | null
}

// Public context value - does not expose internal implementation details
interface ResponsiveLayoutContextValue {
  activePanel: ActivePanel
  selectedConversationTopic: string | null
  isMobile: boolean
  showConversations: () => void
  showChat: (topic: string) => void
  showSettings: () => void
  goBack: () => void
}

const ResponsiveLayoutContext = createContext<ResponsiveLayoutContextValue | null>(null)

interface ResponsiveLayoutProviderProps {
  children: ReactNode
}

export function ResponsiveLayoutProvider({ children }: ResponsiveLayoutProviderProps) {
  const isMobile = useIsMobile()
  const isInitialized = useRef(false)
  const isPopstateNavigation = useRef(false)

  const [state, setState] = useState<ResponsiveLayoutState>({
    activePanel: "conversations",
    selectedConversationTopic: null,
  })

  // Initialize history state on mount
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    // Seed initial history state
    const historyState: HistoryState = {
      panel: state.activePanel,
      topic: state.selectedConversationTopic,
    }
    window.history.replaceState(historyState, "")
  }, [state.activePanel, state.selectedConversationTopic])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const historyState = event.state as HistoryState | null

      if (historyState) {
        isPopstateNavigation.current = true
        setState({
          activePanel: historyState.panel,
          selectedConversationTopic: historyState.topic,
        })
      } else {
        // Fallback to conversations if no state
        isPopstateNavigation.current = true
        setState({
          activePanel: "conversations",
          selectedConversationTopic: null,
        })
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Push history state when panel changes (except for popstate-triggered changes)
  useEffect(() => {
    // Skip if this change was triggered by popstate
    if (isPopstateNavigation.current) {
      isPopstateNavigation.current = false
      return
    }

    // Only push history on mobile and after initialization
    if (!isMobile || !isInitialized.current) return

    const historyState: HistoryState = {
      panel: state.activePanel,
      topic: state.selectedConversationTopic,
    }
    window.history.pushState(historyState, "")
  }, [isMobile, state.activePanel, state.selectedConversationTopic])

  // Navigate to conversation list
  const showConversations = useCallback(() => {
    setState({
      activePanel: "conversations",
      selectedConversationTopic: null,
    })
  }, [])

  // Navigate to chat view with topic
  const showChat = useCallback((topic: string) => {
    setState({
      activePanel: "chat",
      selectedConversationTopic: topic,
    })
  }, [])

  // Navigate to settings/wallet panel
  const showSettings = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activePanel: "settings",
    }))
  }, [])

  // Return to previous panel using browser history on mobile
  const goBack = useCallback(() => {
    if (isMobile) {
      // Use browser history for proper back navigation
      window.history.back()
    } else {
      // On desktop, just return to conversations
      setState({
        activePanel: "conversations",
        selectedConversationTopic: null,
      })
    }
  }, [isMobile])

  const value: ResponsiveLayoutContextValue = {
    activePanel: state.activePanel,
    selectedConversationTopic: state.selectedConversationTopic,
    isMobile,
    showConversations,
    showChat,
    showSettings,
    goBack,
  }

  return (
    <ResponsiveLayoutContext.Provider value={value}>
      {children}
    </ResponsiveLayoutContext.Provider>
  )
}

/**
 * Hook to access responsive layout state and navigation functions
 * Must be used within ResponsiveLayoutProvider
 */
export function useResponsiveLayout(): ResponsiveLayoutContextValue {
  const context = useContext(ResponsiveLayoutContext)
  if (!context) {
    throw new Error("useResponsiveLayout must be used within ResponsiveLayoutProvider")
  }
  return context
}
