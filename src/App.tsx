import { Button } from '@/components/ui/button'
import { WalletButton } from '@/components/wallet'

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Message With Tokens</h1>
      <p className="text-muted-foreground">
        Learn how XMTP messaging fees work
      </p>
      <WalletButton />
      <div className="flex gap-2 mt-4">
        <Button variant="outline" disabled>Get Test Funds</Button>
      </div>
      <p className="text-sm text-muted-foreground mt-8">
        0 messages available
      </p>
    </div>
  )
}

export default App
