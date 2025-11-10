import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getCryptoPriceGuessAddress } from '@/abi/CryptoPriceGuessAddresses';
import { useChainId } from 'wagmi';
import { useMemo } from 'react';

// Simplified ABI for CryptoPriceGuess contract
// This should be replaced with the actual ABI from compiled contract
const CRYPTO_PRICE_GUESS_ABI = [
  {
    inputs: [],
    name: 'getEventCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_eventId', type: 'uint256' }],
    name: 'getPredictionEvent',
    outputs: [
      { internalType: 'string', name: 'title', type: 'string' },
      { internalType: 'uint8', name: 'tokenType', type: 'uint8' },
      { internalType: 'uint256', name: 'targetDate', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'bool', name: 'isActive', type: 'bool' },
      { internalType: 'bool', name: 'isFinalized', type: 'bool' },
      { internalType: 'address', name: 'admin', type: 'address' },
      { internalType: 'uint256', name: 'totalPredictions', type: 'uint256' },
      { internalType: 'uint256', name: 'actualPrice', type: 'uint256' },
      { internalType: 'uint32', name: 'decryptedAveragePrice', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_eventId', type: 'uint256' },
      { internalType: 'bytes32', name: '_encryptedPrice', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'submitPrediction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_eventId', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'hasUserPredicted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: '_title', type: 'string' },
      { internalType: 'uint8', name: '_tokenType', type: 'uint8' },
      { internalType: 'uint256', name: '_targetDate', type: 'uint256' },
      { internalType: 'uint256', name: '_durationInHours', type: 'uint256' },
    ],
    name: 'createPredictionEvent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_eventId', type: 'uint256' }],
    name: 'endPredictionEvent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_eventId', type: 'uint256' },
      { internalType: 'uint256', name: '_actualPrice', type: 'uint256' },
    ],
    name: 'setActualPrice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_eventId', type: 'uint256' }],
    name: 'finalizePredictionEvent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_eventId', type: 'uint256' }],
    name: 'getDecryptedAveragePrice',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useCryptoPriceGuess() {
  const chainId = useChainId();
  const { address } = useAccount();
  const contractAddress = useMemo(() => {
    const addr = getCryptoPriceGuessAddress(chainId);
    console.log("Contract address for chainId", chainId, ":", addr);
    if (!addr || addr === "0x0000000000000000000000000000000000000000") {
      console.warn("Contract not deployed on chain", chainId);
    }
    return addr;
  }, [chainId]);

  // Get event count
  const { data: eventCount, refetch: refetchEventCount } = useReadContract({
    address: contractAddress,
    abi: CRYPTO_PRICE_GUESS_ABI,
    functionName: 'getEventCount',
    query: {
      enabled: !!contractAddress,
    },
  });

  // Note: getEvent should be called directly in components using useReadContract
  // This is just a helper to get the contract config
  const getEventConfig = (eventId: number) => ({
    address: contractAddress,
    abi: CRYPTO_PRICE_GUESS_ABI,
    functionName: 'getPredictionEvent' as const,
    args: [BigInt(eventId)] as const,
    query: {
      enabled: !!contractAddress && eventId >= 0,
    },
  });

  // Check if user has predicted
  const checkUserPredicted = (eventId: number) => {
    return useReadContract({
      address: contractAddress,
      abi: CRYPTO_PRICE_GUESS_ABI,
      functionName: 'hasUserPredicted',
      args: [BigInt(eventId), address!],
      query: {
        enabled: !!contractAddress && !!address && eventId >= 0,
      },
    });
  };

  // Submit prediction
  const { writeContract, data: hash, isPending, error } = useWriteContract({
    mutation: {
      onError: (error) => {
        console.error("Write contract error:", error);
      },
    },
  });
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const submitPrediction = async (eventId: number, encryptedPrice: `0x${string}`, inputProof: `0x${string}`) => {
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }
    
    // Validate inputs
    if (encryptedPrice.length !== 66) {
      throw new Error(`Invalid encrypted price length: ${encryptedPrice.length}, expected 66 (32 bytes)`);
    }
    
    console.log("Calling submitPrediction:", {
      contractAddress,
      eventId,
      encryptedPrice,
      inputProofLength: inputProof.length,
    });
    
    // writeContract is synchronous and triggers the mutation
    // Errors will be handled by the error state and onError callback
    writeContract({
      address: contractAddress,
      abi: CRYPTO_PRICE_GUESS_ABI,
      functionName: 'submitPrediction',
      args: [BigInt(eventId), encryptedPrice, inputProof],
    });
  };

  const createEvent = async (title: string, tokenType: number, targetDate: number, durationInHours: number) => {
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }
    
    // Validate inputs
    if (!title || typeof title !== 'string') {
      throw new Error('Invalid title');
    }
    
    if (typeof tokenType !== 'number' || (tokenType !== 0 && tokenType !== 1)) {
      throw new Error('Invalid token type. Must be 0 (BTC) or 1 (ETH)');
    }
    
    if (typeof targetDate !== 'number' || isNaN(targetDate) || targetDate <= 0) {
      throw new Error(`Invalid target date: ${targetDate}`);
    }
    
    if (typeof durationInHours !== 'number' || isNaN(durationInHours) || durationInHours <= 0) {
      throw new Error(`Invalid duration: ${durationInHours}`);
    }
    
    // Ensure values are integers
    const targetDateInt = Math.floor(targetDate);
    const durationInt = Math.floor(durationInHours);
    
    console.log("Calling createPredictionEvent:", {
      title,
      tokenType,
      targetDate: targetDateInt,
      durationInHours: durationInt,
    });
    
    writeContract({
      address: contractAddress,
      abi: CRYPTO_PRICE_GUESS_ABI,
      functionName: 'createPredictionEvent',
      args: [title, tokenType, BigInt(targetDateInt), BigInt(durationInt)],
    });
  };

  const endEvent = async (eventId: number) => {
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }
    writeContract({
      address: contractAddress,
      abi: CRYPTO_PRICE_GUESS_ABI,
      functionName: 'endPredictionEvent',
      args: [BigInt(eventId)],
    });
  };

  const setActualPrice = async (eventId: number, actualPrice: number) => {
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }
    // Convert price to cents (multiply by 100)
    const priceInCents = Math.round(actualPrice * 100);
    writeContract({
      address: contractAddress,
      abi: CRYPTO_PRICE_GUESS_ABI,
      functionName: 'setActualPrice',
      args: [BigInt(eventId), BigInt(priceInCents)],
    });
  };

  const finalizeEvent = async (eventId: number) => {
    if (!contractAddress) {
      throw new Error('Contract not deployed on this network');
    }
    writeContract({
      address: contractAddress,
      abi: CRYPTO_PRICE_GUESS_ABI,
      functionName: 'finalizePredictionEvent',
      args: [BigInt(eventId)],
    });
  };

  return {
    contractAddress,
    eventCount: eventCount ? Number(eventCount) : 0,
    refetchEventCount,
    getEventConfig,
    checkUserPredicted,
    submitPrediction,
    createEvent,
    endEvent,
    setActualPrice,
    finalizeEvent,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

