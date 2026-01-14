// Simplified ABI - only the depositFromUnderlyingWithPermit function
export const DepositSplitterAbi = [
  {
    type: 'function',
    name: 'depositFromUnderlyingWithPermit',
    inputs: [
      { name: 'payer_', type: 'address', internalType: 'address' },
      { name: 'payerRegistryAmount_', type: 'uint96', internalType: 'uint96' },
      { name: 'appChainRecipient_', type: 'address', internalType: 'address' },
      { name: 'appChainAmount_', type: 'uint96', internalType: 'uint96' },
      { name: 'appChainGasLimit_', type: 'uint256', internalType: 'uint256' },
      { name: 'appChainMaxFeePerGas_', type: 'uint256', internalType: 'uint256' },
      { name: 'deadline_', type: 'uint256', internalType: 'uint256' },
      { name: 'v_', type: 'uint8', internalType: 'uint8' },
      { name: 'r_', type: 'bytes32', internalType: 'bytes32' },
      { name: 's_', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const
