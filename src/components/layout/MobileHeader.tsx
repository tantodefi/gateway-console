import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'

interface MobileHeaderProps {
  /** Title to display - defaults to 'Messages' */
  title?: string
}

/**
 * Mobile header with back navigation.
 * Fixed at top of viewport on mobile.
 * Left: Back button (when not on sidebar)
 * Center: Title with XMTP logo
 *
 * Touch targets are 44px minimum (h-11 w-11 = 44px).
 */
export function MobileHeader({ title: titleProp }: MobileHeaderProps) {
  const { activePanel, goBack, isMobile } = useResponsiveLayout()

  // Only render on mobile
  if (!isMobile) return null

  // Show back button when not on the main sidebar panel
  const showBackButton = activePanel !== 'sidebar'

  // Use provided title, or fall back to 'Messages' for sidebar, conversation context for others
  const title = titleProp ?? 'Messages'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-2 bg-zinc-950 border-b border-zinc-800/50"
      style={{ height: 'var(--mobile-header-height)', paddingTop: 'var(--safe-area-inset-top)' }}
    >
      {/* Left section: Back button or empty placeholder */}
      <div className="w-11 flex justify-start">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="h-11 w-11 min-h-[44px] min-w-[44px] text-zinc-400 hover:text-zinc-100 touch-manipulation"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Center section: Title (user name or conversation) */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-2">
        <span className="text-sm font-medium text-zinc-100 truncate">
          {title}
        </span>
      </div>

      {/* Right section: Empty placeholder for symmetry */}
      <div className="w-11" />
    </header>
  )
}
