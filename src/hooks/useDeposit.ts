import { useCallback, useState } from 'react'
import {
  useAccount,
  useWalletClient,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi'
import { parseUnits, zeroAddress } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { generatePermitSignature } from '@/lib/permit'
import { DepositSplitterAbi } from '@/abi/DepositSplitter'
import { MockUnderlyingFeeTokenAbi } from '@/abi/MockUnderlyingFeeToken'
import { CONTRACTS, TOKENS, GATEWAY_PAYER_ADDRESS } from '@/lib/constants'

export type DepositStatus = 'idle' | 'signing' | 'pending' | 'confirming' | 'success' | 'error'

export function useDeposit() {
  const [status, setStatus] = useState<DepositStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const { address } = useAccount()
  const { data: walletClient } = useWalletClient({ chainId: baseSepolia.id })

  const { writeContract, data: hash, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Get user's mUSD balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: TOKENS.underlyingFeeToken.address,
    abi: MockUnderlyingFeeTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  const deposit = useCallback(
    async (amountString: string) => {
      if (!address || !walletClient) {
        setError(new Error('Wallet not connected'))
        return
      }

      if (!GATEWAY_PAYER_ADDRESS) {
        setError(new Error('Gateway payer address not configured'))
        return
      }

      const amount = parseUnits(amountString, TOKENS.underlyingFeeToken.decimals)

      if (balance !== undefined && amount > balance) {
        setError(new Error('Insufficient balance'))
        return
      }

      setStatus('signing')
      setError(null)

      try {
        // Deadline: 1 hour from now
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60)

        // Sign the permit
        const permit = await generatePermitSignature(
          walletClient,
          address,
          CONTRACTS.depositSplitter,
          amount,
          deadline
        )

        setStatus('pending')

        // Deposit with permit
        // We deposit all to PayerRegistry (messaging fees), nothing to AppChain
        writeContract(
          {
            address: CONTRACTS.depositSplitter,
            abi: DepositSplitterAbi,
            functionName: 'depositFromUnderlyingWithPermit',
            args: [
              GATEWAY_PAYER_ADDRESS,  // payer - the gateway's payer address
              BigInt(amount),         // payerRegistryAmount - deposit for messaging
              zeroAddress,            // appChainRecipient - not used
              0n,                     // appChainAmount - 0 for this demo
              0n,                     // appChainGasLimit - not used
              0n,                     // appChainMaxFeePerGas - not used
              deadline,               // permit deadline
              permit.v,               // signature v
              permit.r,               // signature r
              permit.s,               // signature s
            ],
            chainId: baseSepolia.id,
          },
          {
            onSuccess: () => {
              setStatus('confirming')
            },
            onError: (err) => {
              setStatus('error')
              setError(err instanceof Error ? err : new Error('Transaction rejected'))
            },
          }
        )
      } catch (err) {
        setStatus('error')
        if (err instanceof Error) {
          // User rejected the signature request
          if (err.message.includes('rejected') || err.message.includes('denied')) {
            setError(new Error('Signature rejected'))
          } else {
            setError(err)
          }
        } else {
          setError(new Error('Failed to sign permit'))
        }
      }
    },
    [address, walletClient, balance, writeContract]
  )

  // Track success state
  if (isSuccess && status === 'confirming') {
    setStatus('success')
    refetchBalance()
  }

  // Track confirming state
  if (isConfirming && status === 'pending') {
    setStatus('confirming')
  }

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  return {
    deposit,
    status,
    error,
    isPending: isPending || isConfirming || status === 'signing',
    isSuccess,
    hash,
    balance,
    reset,
    refetchBalance,
  }
}
