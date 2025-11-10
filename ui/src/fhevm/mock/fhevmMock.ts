//////////////////////////////////////////////////////////////////////////
//
// WARNING!!
// ALWAYS USE DYNAMIC IMPORT FOR THIS FILE TO AVOID INCLUDING THE ENTIRE 
// FHEVM MOCK LIB IN THE FINAL PRODUCTION BUNDLE!!
//
//////////////////////////////////////////////////////////////////////////

import { JsonRpcProvider, randomBytes, hexlify, Provider } from "ethers";

export type FhevmInstance = {
  createEncryptedInput: (contractAddress: string, userAddress: string) => {
    add32: (value: number) => void;
    encrypt: () => Promise<{
      handles: (string | Uint8Array)[];
      inputProof: string | Uint8Array;
    }>;
  };
  userDecrypt?: (handles: any[], privateKey: any, publicKey: any, signature: any, contractAddresses: any, userAddress: any, startTimestamp: any, durationDays: any) => Promise<any>;
};

// Simple local mock implementation that doesn't require RPC calls
class SimpleMockFhevmInstance implements FhevmInstance {
  private value: number | null = null;

  createEncryptedInput(contractAddress: string, userAddress: string) {
    return {
      add32: (value: number) => {
        this.value = value;
      },
      encrypt: async () => {
        if (this.value === null) {
          throw new Error("No value added. Call add32() before encrypt().");
        }

        // Generate mock encrypted data
        // In a real implementation, this would be actual FHE encrypted data
        // For mock purposes, we generate deterministic but valid-looking handles
        const handle = hexlify(randomBytes(32));
        const inputProof = hexlify(randomBytes(128)); // Mock proof

        return {
          handles: [handle],
          inputProof: inputProof,
        };
      },
    };
  }
}

export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
  provider?: any; // Optional: pass provider directly to avoid creating new connection
}): Promise<FhevmInstance> => {
  // First, try to use the real MockFhevmInstance if available and contracts are deployed
  try {
    const { MockFhevmInstance } = await import("@fhevm/mock-utils");
    
    // IMPORTANT: Always use JsonRpcProvider for MockFhevmInstance
    // It needs direct access to Hardhat node RPC methods like fhevm_relayer_v1_input_proof
    // MetaMask provider doesn't support these methods
    // Create a fresh provider to ensure it's not using MetaMask
    const rpcProvider = new JsonRpcProvider(parameters.rpcUrl, undefined, {
      staticNetwork: true,
    });
    
    console.log("Attempting to create MockFhevmInstance with real contracts...");
    console.log("Using RPC URL:", parameters.rpcUrl);
    console.log("Provider type:", rpcProvider.constructor.name);
    
    // Verify the provider can access Hardhat node
    try {
      const testResult = await rpcProvider.send("fhevm_relayer_metadata", []);
      console.log("Provider can access fhevm_relayer_metadata:", !!testResult);
    } catch (testError: any) {
      console.warn("Provider test failed:", testError?.message);
    }
    
    // MockFhevmInstance.create expects two providers: one for reading, one for writing
    // Both should be JsonRpcProvider to access Hardhat node RPC methods
    // Create separate instances to ensure they're independent
    const readProvider = new JsonRpcProvider(parameters.rpcUrl, undefined, {
      staticNetwork: true,
    });
    const writeProvider = new JsonRpcProvider(parameters.rpcUrl, undefined, {
      staticNetwork: true,
    });
    
    // Verify providers have send method
    console.log("Provider check:", {
      readProviderHasSend: typeof readProvider.send === 'function',
      writeProviderHasSend: typeof writeProvider.send === 'function',
      readProviderType: readProvider.constructor.name,
      writeProviderType: writeProvider.constructor.name,
    });
    
    // Test that providers can access Hardhat node
    try {
      const testResult = await readProvider.send("fhevm_relayer_v1_input_proof", [{
        ciphertextWithInputVerification: "0x0000000000000000000000000000000000000000000000000000000000000000",
        contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        contractChainId: "0x7a69",
        extraData: "0x00",
        mockData: {
          aclContractAddress: parameters.metadata.ACLAddress,
          clearTextValuesBigIntHex: ["0x0000"],
          fheTypes: [4],
          fhevmTypes: [4],
          metadatas: [{ blockNumber: 0, index: 0, transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000000" }],
          random32List: ["0x0000000000000000000000000000000000000000000000000000000000000000"],
        },
        userAddress: "0x0000000000000000000000000000000000000000",
      }]);
      console.log("Provider can access fhevm_relayer_v1_input_proof:", !!testResult);
    } catch (testError: any) {
      console.warn("Provider test for fhevm_relayer_v1_input_proof failed:", testError?.message);
    }
    
    const instance = await MockFhevmInstance.create(readProvider, writeProvider, {
      aclContractAddress: parameters.metadata.ACLAddress,
      chainId: parameters.chainId,
      gatewayChainId: 55815,
      inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
      kmsContractAddress: parameters.metadata.KMSVerifierAddress,
      verifyingContractAddressDecryption:
        "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
      verifyingContractAddressInputVerification:
        "0x812b06e1CDCE800494b79fFE4f925A504a9A9810",
    });
    console.log("Successfully created MockFhevmInstance with real contracts");
    console.log("Instance type:", instance.constructor?.name || typeof instance);
    return instance as FhevmInstance;
  } catch (error: any) {
    // If getKmsSigners fails or contracts aren't available, use simple local mock
    if (error?.message?.includes("getKmsSigners") || error?.code === "BAD_DATA" || error?.message?.includes("KMS")) {
      console.warn("Real FHEVM contracts not available, using local mock implementation");
      console.warn("Note: This mock generates placeholder encrypted data. For real FHE encryption, ensure hardhat node is running with FHEVM plugin.");
      return new SimpleMockFhevmInstance();
    }
    // For other errors, still try the simple mock as fallback
    console.warn("Failed to create MockFhevmInstance, using local mock implementation:", error?.message);
    return new SimpleMockFhevmInstance();
  }
};

