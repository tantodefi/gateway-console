import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WalletProvider } from './components/wallet'
import { XMTPProvider, MessagingProvider } from './contexts'
import { TooltipProvider } from './components/ui/tooltip'
import { ResponsiveLayoutProvider } from './hooks/useResponsiveLayout'
import { GATEWAY_URL } from './lib/constants'

// Set gateway host in localStorage for XMTP SDK
localStorage.setItem('XMTP_GATEWAY_HOST', GATEWAY_URL)
console.log('[XMTP] Gateway:', GATEWAY_URL)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <ResponsiveLayoutProvider>
        <WalletProvider>
          <XMTPProvider>
            <MessagingProvider>
              <App />
            </MessagingProvider>
          </XMTPProvider>
        </WalletProvider>
      </ResponsiveLayoutProvider>
    </TooltipProvider>
  </StrictMode>,
)
