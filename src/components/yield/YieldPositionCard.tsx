import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog'
import { useAavePosition, type AavePosition } from '@/hooks/useAavePosition'
import { useHarvestYield, type HarvestDestination } from '@/hooks/useHarvestYield'
import {
  TrendingUp,
  Coins,
  ArrowDownToLine,
  Loader2,
  CheckCircle2,
  XCircle,
  Wallet,
  AlertTriangle,
  User,
  Building2,
  MessageSquare,
  RefreshCw,
} from 'lucide-react'
import { AAVE_ASSETS } from '@/lib/constants'

function PositionCard({ position }: { position: AavePosition }) {
  const [harvestOpen, setHarvestOpen] = useState(false)
  const [destination, setDestination] = useState<HarvestDestination>('user')
  const { harvestAndDeposit, withdraw, state, isPending, reset, supportsBatchedCalls, walletTypeLabel, isAppPayerConfigured } = useHarvestYield()

  const assetConfig = AAVE_ASSETS[position.asset]
  const hasYield = position.accruedYield > 0n

  const handleHarvest = () => {
    harvestAndDeposit(position.asset, position.accruedYield, destination)
  }

  const handleWithdrawAll = () => {
    withdraw(position.asset, position.aTokenBalance)
  }

  // Get step description for UI
  const getStepDescription = () => {
    // Batched mode (smart wallet) - single operation
    if (state.isBatchMode) {
      switch (state.step) {
        case 'batching':
          return 'Confirm batch transaction...'
        case 'batch-confirming':
          return 'Processing batch (one signature)...'
        default:
          return 'Processing...'
      }
    }
    // Multi-step mode (EOA wallet)
    switch (state.step) {
      case 'withdrawing':
      case 'withdraw-confirming':
        return 'Step 1/3: Withdrawing from Aave...'
      case 'minting':
      case 'mint-confirming':
        return 'Step 2/3: Converting to mUSD...'
      case 'signing':
        return 'Step 3/3: Please sign the permit...'
      case 'depositing':
      case 'deposit-confirming':
        return 'Step 3/3: Depositing to gateway...'
      default:
        return 'Processing...'
    }
  }

  const renderHarvestContent = () => {
    if (state.step === 'success') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <div className="text-center">
            <h3 className="font-medium">Harvest Complete!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Yield has been deposited to your gateway to fund messages.
            </p>
          </div>
          <Button onClick={() => { reset(); setHarvestOpen(false); }} className="w-full">
            Done
          </Button>
        </div>
      )
    }

    if (state.step === 'error' && state.error) {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <XCircle className="h-12 w-12 text-red-500" />
          <div className="text-center">
            <h3 className="font-medium text-red-400">Transaction Failed</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {state.error.message}
            </p>
          </div>
          <Button onClick={reset} variant="outline" className="w-full">
            Try Again
          </Button>
        </div>
      )
    }

    if (isPending) {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <div className="text-center">
            <h3 className="font-medium">{getStepDescription()}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {state.isBatchMode
                ? 'All operations in one transaction'
                : state.step === 'signing'
                ? 'Sign the permit in your wallet'
                : 'Please confirm in your wallet'}
            </p>
          </div>
          {/* Progress indicator */}
          {state.isBatchMode ? (
            // Batched mode: single progress bar
            <div className="flex gap-2">
              <div className={`h-2 w-24 rounded ${state.step === 'batch-confirming' ? 'bg-blue-500 animate-pulse' : 'bg-blue-500'}`} />
            </div>
          ) : (
            // Multi-step mode: 3 step progress
            <div className="flex gap-2">
              <div className={`h-2 w-8 rounded ${['withdrawing', 'withdraw-confirming', 'minting', 'mint-confirming', 'signing', 'depositing', 'deposit-confirming'].includes(state.step) ? 'bg-blue-500' : 'bg-zinc-700'}`} />
              <div className={`h-2 w-8 rounded ${['minting', 'mint-confirming', 'signing', 'depositing', 'deposit-confirming'].includes(state.step) ? 'bg-blue-500' : 'bg-zinc-700'}`} />
              <div className={`h-2 w-8 rounded ${['signing', 'depositing', 'deposit-confirming'].includes(state.step) ? 'bg-blue-500' : 'bg-zinc-700'}`} />
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="p-4 bg-zinc-900/50 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Position Value</span>
            <span className="font-medium">{position.formatted.positionValue}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Accrued Yield</span>
            <span className="font-medium text-emerald-400">
              {position.formatted.accruedYield}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Current APY</span>
            <span className="font-medium">{position.formatted.apy}</span>
          </div>
        </div>

        {/* Deposit Destination Selection */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Deposit yield to:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDestination('user')}
              className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                destination === 'user'
                  ? 'bg-blue-900/30 border-blue-500 text-blue-300'
                  : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <User className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">My Balance</div>
                <div className="text-xs opacity-70">Fund my messages</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDestination('app')}
              className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                destination === 'app'
                  ? 'bg-purple-900/30 border-purple-500 text-purple-300'
                  : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">App Gateway</div>
                <div className="text-xs opacity-70">Fund all users</div>
              </div>
            </button>
          </div>
          
          {/* Warning when app destination selected but not configured */}
          {destination === 'app' && !isAppPayerConfigured && (
            <div className="flex items-start gap-2 p-2 bg-amber-900/20 border border-amber-700/30 rounded text-xs text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">App payer not configured.</span>{' '}
                Set <code className="bg-zinc-800 px-1 rounded">VITE_GATEWAY_PAYER_ADDRESS</code> in your .env file.
              </div>
            </div>
          )}
        </div>

        {/* Harvest flow explanation */}
        {supportsBatchedCalls ? (
          <div className="p-3 bg-emerald-900/20 border border-emerald-800/30 rounded text-xs text-emerald-300">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">⚡ {walletTypeLabel}</span>
            </div>
            <p className="text-emerald-400">
              Harvest with a single signature: withdraw → convert → deposit all in one transaction.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded text-xs text-blue-300">
            <p className="font-medium mb-1">Harvest will:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-400">
              <li>Withdraw yield from Aave</li>
              <li>Convert to mUSD (testnet mock)</li>
              <li>Deposit to {destination === 'user' ? 'your payer balance' : 'app gateway'}</li>
            </ol>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleHarvest}
            disabled={!hasYield || (destination === 'app' && !isAppPayerConfigured)}
            className="w-full"
          >
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Harvest Yield ({position.formatted.accruedYield})
          </Button>

          <Button
            onClick={handleWithdrawAll}
            variant="outline"
            className="w-full"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Withdraw All
          </Button>
        </div>

        <p className="text-xs text-zinc-500 text-center">
          {destination === 'user' 
            ? 'Yield will be deposited to your personal payer balance.'
            : 'Yield will fund messaging for all app users.'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-zinc-400" />
          <span className="font-medium">{assetConfig.symbol}</span>
        </div>
        <Badge variant="outline" className="text-emerald-400 border-emerald-800">
          {position.formatted.apy} APY
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-zinc-500">Balance</div>
          <div className="font-mono">{position.formatted.aTokenBalance}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Value</div>
          <div className="font-medium">{position.formatted.positionValue}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 bg-emerald-900/20 border border-emerald-800/30 rounded">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-zinc-400">Accrued Yield</div>
          <div className="text-sm font-medium text-emerald-400 truncate">
            {position.formatted.accruedYield}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-800/30 rounded">
        <MessageSquare className="h-4 w-4 text-blue-400" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-zinc-400">Est. Messages/Month</div>
          <div className="text-sm font-bold text-zinc-100">
            ~{position.formatted.messagesPerMonth}
          </div>
        </div>
      </div>

      <ResponsiveDialog open={harvestOpen} onOpenChange={setHarvestOpen}>
        <ResponsiveDialogTrigger asChild>
          <Button size="sm" className="w-full" disabled={!hasYield}>
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Harvest & Fund Messages
          </Button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              Harvest Yield - {assetConfig.symbol}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Withdraw accrued yield and deposit to XMTP gateway.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {renderHarvestContent()}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}

export function YieldPositionCard() {
  const {
    positions,
    isLoading,
    refetch,
    formatted,
  } = useAavePosition()

  const hasPositions = Object.values(positions).some((p) => p !== null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Yield Positions
          </span>
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!hasPositions) {
    return (
      <div className="space-y-2">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          Yield Positions
        </div>
        <div className="p-4 bg-zinc-900/30 rounded-lg border border-zinc-800/30 text-center">
          <TrendingUp className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
          <p className="text-sm text-zinc-400">No yield positions yet</p>
          <p className="text-xs text-zinc-500 mt-1">
            Deposit to Aave to start earning yield
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          Yield Positions
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-800/50 rounded-lg text-center text-xs">
        <div>
          <div className="text-zinc-500">Total Value</div>
          <div className="font-medium">{formatted.totalValue}</div>
        </div>
        <div>
          <div className="text-zinc-500">Yield</div>
          <div className="font-medium text-emerald-400">{formatted.totalYield}</div>
        </div>
        <div>
          <div className="text-zinc-500">Msgs/Mo</div>
          <div className="font-medium">{formatted.totalMessages}</div>
        </div>
      </div>

      {/* Position Cards */}
      {Object.entries(positions).map(([key, position]) => {
        if (!position) return null
        return <PositionCard key={key} position={position} />
      })}
    </div>
  )
}
