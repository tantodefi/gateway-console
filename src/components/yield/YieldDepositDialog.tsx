import { useState, useMemo } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { formatUnits } from 'viem'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useYieldDeposit } from '@/hooks/useYieldDeposit'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MessageSquare,
  AlertCircle,
} from 'lucide-react'
import { type AaveAssetKey } from '@/lib/constants'
import {
  calculateYieldProjection,
  getDepositTiers,
  formatCurrency,
  meetsMinimumDeposit,
  getMinimumDepositError,
} from '@/lib/yieldCalculations'

type AssetOption = 'USDC' | 'WETH' | 'ETH'

export function YieldDepositDialog() {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<AssetOption>('USDC')
  const { isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const {
    deposit,
    status,
    error,
    isPending,
    balances,
    reset,
  } = useYieldDeposit()

  const isWrongNetwork = chainId !== baseSepolia.id

  // Get balance based on selected asset
  const getBalance = () => {
    if (selectedAsset === 'ETH') return balances.eth
    if (selectedAsset === 'WETH') return balances.weth
    return balances.usdc
  }

  const getDecimals = () => {
    if (selectedAsset === 'ETH' || selectedAsset === 'WETH') return 18
    return 6
  }

  const rawBalance = getBalance()
  const decimals = getDecimals()
  const formattedBalance = rawBalance
    ? parseFloat(formatUnits(rawBalance, decimals)).toFixed(4)
    : '0'

  // Parse amount and calculate USD value
  const parsedAmount = parseFloat(amount) || 0
  const usdValue = useMemo(() => {
    if (parsedAmount <= 0) return 0
    if (selectedAsset === 'ETH' || selectedAsset === 'WETH') {
      return parsedAmount * 2500 // Mock ETH price
    }
    return parsedAmount
  }, [parsedAmount, selectedAsset])

  const projection = useMemo(() => {
    return calculateYieldProjection(usdValue)
  }, [usdValue])

  const meetsMinimum = meetsMinimumDeposit(usdValue)
  const minimumError = getMinimumDepositError(usdValue)

  const maxAmount = rawBalance ? parseFloat(formatUnits(rawBalance, decimals)) : 0
  const isValidAmount = parsedAmount > 0 && parsedAmount <= maxAmount && meetsMinimum

  // Deposit tiers for reference
  const tiers = getDepositTiers()

  const handleDeposit = () => {
    if (!isValidAmount) return
    const aaveAsset: AaveAssetKey = selectedAsset === 'ETH' ? 'WETH' : selectedAsset
    const useNativeEth = selectedAsset === 'ETH'
    deposit(amount, aaveAsset, useNativeEth)
  }

  const handleMax = () => {
    setAmount(maxAmount.toString())
  }

  const handleSwitchNetwork = () => {
    switchChain({ chainId: baseSepolia.id })
  }

  const renderAssetSelector = () => (
    <div className="flex gap-2">
      {(['USDC', 'WETH', 'ETH'] as AssetOption[]).map((asset) => (
        <Button
          key={asset}
          variant={selectedAsset === asset ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedAsset(asset)}
          className="flex-1"
        >
          {asset}
        </Button>
      ))}
    </div>
  )

  const renderYieldProjection = () => {
    if (usdValue <= 0) return null

    return (
      <div className="space-y-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
        <div className="flex items-center gap-2 text-sm text-zinc-200">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span>Yield Projection ({projection.apyPercent}% APY)</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-zinc-400">Monthly Yield</div>
            <div className="text-sm font-semibold text-emerald-400">
              {projection.formattedMonthlyYield}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Yearly Yield</div>
            <div className="text-sm font-semibold text-emerald-400">
              {projection.formattedYearlyYield}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-zinc-900 rounded border border-zinc-700">
          <MessageSquare className="h-4 w-4 text-blue-400" />
          <div className="flex-1">
            <div className="text-xs text-zinc-400">Messages Funded Monthly</div>
            <div className="text-sm font-bold text-white">
              ~{projection.formattedMessagesPerMonth} messages
            </div>
          </div>
        </div>

        {!meetsMinimum && (
          <div className="flex items-center gap-2 p-2 bg-amber-900/20 border border-amber-800/50 rounded text-amber-400 text-xs">
            <AlertCircle className="h-4 w-4" />
            <span>{minimumError}</span>
          </div>
        )}
      </div>
    )
  }

  const renderTiersReference = () => (
    <div className="space-y-2">
      <div className="text-xs text-zinc-400 font-medium">Deposit Tiers Reference</div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {tiers.slice(0, 6).map((tier) => (
          <button
            key={tier.depositUsd}
            onClick={() => {
              if (selectedAsset === 'ETH' || selectedAsset === 'WETH') {
                setAmount((tier.depositUsd / 2500).toFixed(4))
              } else {
                setAmount(tier.depositUsd.toString())
              }
            }}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-600 text-left transition-colors"
          >
            <div className="font-semibold text-white">{tier.label}</div>
            <div className="text-zinc-300">
              ~{tier.projection.formattedMessagesPerMonth}/mo
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderContent = () => {
    if (!isConnected) {
      return (
        <div className="text-center py-4">
          <p className="text-muted-foreground">
            Connect your wallet to deposit into Aave.
          </p>
        </div>
      )
    }

    if (isWrongNetwork) {
      return (
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Please switch to Base Sepolia to deposit.
          </p>
          <Button onClick={handleSwitchNetwork} className="w-full">
            Switch to Base Sepolia
          </Button>
        </div>
      )
    }

    // Success state
    if (status === 'success') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <div className="text-center">
            <h3 className="font-medium">Deposit Successful!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your funds are now earning yield in Aave V3.
            </p>
          </div>
          <Button onClick={() => { reset(); setOpen(false); }} className="w-full">
            Done
          </Button>
        </div>
      )
    }

    // Error state
    if (status === 'error' && error) {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <XCircle className="h-12 w-12 text-red-500" />
          <div className="text-center">
            <h3 className="font-medium text-red-400">Deposit Failed</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {error.message}
            </p>
          </div>
          <Button onClick={reset} variant="outline" className="w-full">
            Try Again
          </Button>
        </div>
      )
    }

    // Pending states
    if (isPending) {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <div className="text-center">
            <h3 className="font-medium">
              {status === 'approving' && 'Approving...'}
              {status === 'wrapping' && 'Wrapping ETH...'}
              {status === 'supplying' && 'Supplying to Aave...'}
              {status === 'confirming' && 'Confirming...'}
              {status === 'pending' && 'Processing...'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please confirm in your wallet
            </p>
          </div>
        </div>
      )
    }

    // Main deposit form
    return (
      <div className="space-y-4">
        {/* Asset Selector */}
        {renderAssetSelector()}

        {/* Balance Display */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Available Balance</span>
          <span className="font-mono text-white">
            {formattedBalance} {selectedAsset}
          </span>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={handleMax}>
              Max
            </Button>
          </div>
          {usdValue > 0 && selectedAsset !== 'USDC' && (
            <div className="text-xs text-zinc-300 text-right">
              ≈ {formatCurrency(usdValue)}
            </div>
          )}
        </div>

        {/* Yield Projection */}
        {renderYieldProjection()}

        {/* Deposit Button */}
        <Button
          onClick={handleDeposit}
          disabled={!isValidAmount}
          className="w-full"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Deposit to Aave
        </Button>

        {/* Tiers Reference */}
        {renderTiersReference()}

        {/* Info */}
        <p className="text-xs text-zinc-400 text-center">
          Deposits earn yield on Aave V3. Harvest yield anytime to fund your XMTP messages.
        </p>
      </div>
    )
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <TrendingUp className="h-4 w-4" />
          Yield Deposit
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Deposit for Yield
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Deposit to Aave V3 and use accrued interest to fund XMTP messages.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {renderContent()}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
