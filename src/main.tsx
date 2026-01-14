import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WalletProvider } from './components/wallet'
import { XMTPProvider, MessagingProvider } from './contexts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <XMTPProvider>
        <MessagingProvider>
          <App />
        </MessagingProvider>
      </XMTPProvider>
    </WalletProvider>
  </StrictMode>,
)
