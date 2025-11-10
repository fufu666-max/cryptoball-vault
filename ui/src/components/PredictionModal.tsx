import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useAccount, useWalletClient, useChainId, useReadContract } from "wagmi";
import { useCryptoPriceGuess } from "@/hooks/useCryptoPriceGuess";
import { ethers } from "ethers";
import { getCryptoPriceGuessAddress } from "@/abi/CryptoPriceGuessAddresses";

interface PredictionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  eventId?: number;
  onSuccess?: () => void; // Callback when prediction is successfully submitted
}

const PredictionModal = ({ open, onOpenChange, eventTitle, eventId, onSuccess }: PredictionModalProps) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { submitPrediction, isPending, isConfirmed, contractAddress, error: contractError } = useCryptoPriceGuess();
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fhevmInstance, setFhevmInstance] = useState<any>(null);
  const [fhevmLoading, setFhevmLoading] = useState(false);
  
  // Monitor contract errors from writeContract
  useEffect(() => {
    if (contractError) {
      console.error("Contract write error:", contractError);
      let errorMsg = contractError.message || "Transaction failed";
      
      // Try to extract more details from the error
      const errorAny = contractError as any;
      if (errorAny.cause) {
        const cause = errorAny.cause;
        if (cause?.data?.message) {
          errorMsg = cause.data.message;
        } else if (cause?.message) {
          errorMsg = cause.message;
        }
      }
      
      toast.error(`Failed to submit: ${errorMsg}`);
      setIsSubmitting(false);
    }
  }, [contractError]);

  // Initialize FHEVM instance
  useEffect(() => {
    if (!open || !walletClient || !contractAddress) return;

    const initFhevm = async () => {
      try {
        setFhevmLoading(true);
        
        // Check if we're on a mock chain (localhost)
        const isMock = chainId === 31337;
        
        if (isMock) {
          // For localhost, try to get real FHEVM metadata from Hardhat node first
          console.log("Initializing FHEVM for localhost...");
          
          try {
          const provider = new ethers.BrowserProvider(walletClient as any);
          const network = await provider.getNetwork();
            const networkChainId = Number(network.chainId);
            
            console.log("Network chainId:", networkChainId);
            
            // Check if hardhat node is running by trying to get block number
            try {
              await provider.getBlockNumber();
              console.log("Hardhat node is accessible");
            } catch (nodeError) {
              throw new Error("Cannot connect to hardhat node. Please ensure 'npx hardhat node' is running on http://127.0.0.1:8545");
            }
            
            // Try to fetch FHEVM relayer metadata from Hardhat node
            let metadata: {
              ACLAddress: `0x${string}`;
              InputVerifierAddress: `0x${string}`;
              KMSVerifierAddress: `0x${string}`;
            } | undefined;
            
            try {
              const rpcProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
              const fhevmMetadata = await rpcProvider.send("fhevm_relayer_metadata", []);
              console.log("FHEVM relayer metadata:", fhevmMetadata);
              
              if (fhevmMetadata && 
                  typeof fhevmMetadata === 'object' &&
                  'ACLAddress' in fhevmMetadata &&
                  'InputVerifierAddress' in fhevmMetadata &&
                  'KMSVerifierAddress' in fhevmMetadata) {
                metadata = {
                  ACLAddress: fhevmMetadata.ACLAddress as `0x${string}`,
                  InputVerifierAddress: fhevmMetadata.InputVerifierAddress as `0x${string}`,
                  KMSVerifierAddress: fhevmMetadata.KMSVerifierAddress as `0x${string}`,
                };
                console.log("Using FHEVM metadata from Hardhat node:", metadata);
              }
            } catch (metadataError: any) {
              console.warn("Could not fetch FHEVM metadata from Hardhat node:", metadataError?.message);
              console.warn("This is normal if Hardhat node is not running with FHEVM plugin");
            }
            
            // Use metadata if available, otherwise use zero addresses (will fallback to simple mock)
            const defaultMetadata = metadata || {
              ACLAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
              InputVerifierAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
              KMSVerifierAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
            };
            
            console.log("Importing mock FHEVM module...");
            // Dynamically import mock FHEVM
            const { fhevmMockCreateInstance } = await import("@/fhevm/mock/fhevmMock");
            
            console.log("Creating mock FHEVM instance...");
            // Note: fhevmMockCreateInstance will create its own JsonRpcProvider
            // to access Hardhat node RPC methods (like fhevm_relayer_v1_input_proof)
            // MetaMask provider doesn't support these methods
            const instance = await fhevmMockCreateInstance({
              rpcUrl: `http://127.0.0.1:8545`,
              chainId: networkChainId,
              metadata: defaultMetadata,
              // Don't pass provider - MockFhevmInstance needs direct RPC access
            });
            
            console.log("Mock FHEVM instance created successfully");
            setFhevmInstance(instance);
          } catch (mockError: any) {
            console.error("Error initializing mock FHEVM:", mockError);
            console.error("Error details:", {
              message: mockError?.message,
              stack: mockError?.stack,
              name: mockError?.name,
              code: mockError?.code,
            });
            
            // Provide helpful error message
            let errorMessage = "Failed to initialize mock FHEVM";
            if (mockError?.message?.includes("getKmsSigners") || mockError?.message?.includes("KMS")) {
              errorMessage = "FHEVM initialization failed: KMS contract not available. Please ensure hardhat node is running with FHEVM plugin enabled.";
            } else if (mockError?.message?.includes("Cannot connect")) {
              errorMessage = mockError.message;
            } else {
              errorMessage = `${errorMessage}: ${mockError?.message || "Unknown error"}`;
            }
            
            throw new Error(errorMessage);
          }
        } else {
          // For Sepolia, load the relayer SDK
          console.log("Initializing FHEVM for Sepolia...");
          
          if (typeof window !== "undefined" && (window as any).relayerSDK) {
            const relayerSDK = (window as any).relayerSDK;
            
            // Initialize SDK if not already initialized
            if (!relayerSDK.__initialized__) {
              console.log("Initializing relayer SDK...");
              await relayerSDK.initSDK();
            }
            
            // Create instance
            const config = relayerSDK.SepoliaConfig;
            console.log("Creating FHEVM instance for Sepolia...");
            const instance = await relayerSDK.createInstance({
              ...config,
              network: walletClient,
            });
            console.log("FHEVM instance created successfully");
            setFhevmInstance(instance);
          } else {
            const errorMsg = "FHEVM Relayer SDK not loaded. Please ensure @zama-fhe/relayer-sdk is available.";
            console.warn(errorMsg);
            throw new Error(errorMsg);
          }
        }
      } catch (error: any) {
        console.error("Error initializing FHEVM:", error);
        const errorMessage = error?.message || "Failed to initialize FHE encryption. Please try again.";
        console.error("Full error:", error);
        toast.error(errorMessage);
      } finally {
        setFhevmLoading(false);
      }
    };

    initFhevm();
  }, [open, walletClient, contractAddress, chainId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (eventId === undefined || eventId === null) {
      toast.error("Invalid event ID");
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (!fhevmInstance) {
      toast.error("FHE encryption not ready. Please wait...");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert price to cents (multiply by 100)
      // For example: $50,000 = 5000000 cents
      const priceInCents = Math.round(priceValue * 100);
      
      toast.info("Encrypting price prediction...");
      
      // Encrypt using FHEVM
      const input = fhevmInstance.createEncryptedInput(
        contractAddress!,
        address
      );
      input.add32(priceInCents);
      const encrypted = await input.encrypt();

      // Convert handle to hex string
      let handleHex: string;
      if (typeof encrypted.handles[0] === 'string') {
        handleHex = encrypted.handles[0];
      } else {
        handleHex = ethers.hexlify(encrypted.handles[0]);
        // Ensure it's 32 bytes (66 chars including 0x)
        if (handleHex.length < 66) {
          const padded = handleHex.slice(2).padStart(64, '0');
          handleHex = `0x${padded}`;
        } else if (handleHex.length > 66) {
          handleHex = handleHex.slice(0, 66);
        }
      }

      // Convert inputProof to hex if needed
      let inputProofHex: string;
      if (typeof encrypted.inputProof === 'string') {
        inputProofHex = encrypted.inputProof;
      } else {
        inputProofHex = ethers.hexlify(encrypted.inputProof);
      }

      toast.info("Submitting encrypted prediction...");
      
      // Log the data being submitted for debugging
      console.log("Submitting prediction:", {
        eventId,
        handleHex,
        handleLength: handleHex.length,
        inputProofHex: inputProofHex.substring(0, 20) + "...",
        inputProofLength: inputProofHex.length,
        contractAddress,
      });
      
      // Validate handle format (should be 32 bytes = 66 chars with 0x)
      if (handleHex.length !== 66) {
        throw new Error(`Invalid handle length: ${handleHex.length}, expected 66 (32 bytes)`);
      }
      
      // Check if event exists before submitting
      try {
        const provider = new ethers.BrowserProvider(walletClient as any);
        const contract = new ethers.Contract(
          contractAddress!,
          [
            "function getPredictionEvent(uint256) view returns (string, uint8, uint256, uint256, bool, bool, address, uint256, uint256, uint32)",
            "function hasUserPredicted(uint256, address) view returns (bool)",
          ],
          provider
        );
        
        // Check if event exists
        try {
          const eventData = await contract.getPredictionEvent(eventId);
          console.log("Event data before submission:", {
            title: eventData[0],
            tokenType: eventData[1],
            targetDate: Number(eventData[2]),
            endTime: Number(eventData[3]),
            isActive: eventData[4],
            isFinalized: eventData[5],
            admin: eventData[6],
            totalPredictions: Number(eventData[7]),
            currentTime: Math.floor(Date.now() / 1000),
          });
          
          if (!eventData) {
            throw new Error(`Event ${eventId} does not exist. Please create an event first.`);
          }
          
          if (!eventData[4]) { // isActive
            throw new Error("Event is not active. It may have been ended or finalized.");
          }
          
          const endTime = Number(eventData[3]);
          const currentTime = Math.floor(Date.now() / 1000);
          if (currentTime >= endTime) {
            throw new Error(`Event has ended. End time: ${new Date(endTime * 1000).toLocaleString()}`);
          }
          
          if (eventData[5]) { // isFinalized
            throw new Error("Event has been finalized. No more predictions can be submitted.");
          }
          
          // Check if user already predicted
          const hasPredicted = await contract.hasUserPredicted(eventId, address);
          if (hasPredicted) {
            throw new Error("You have already submitted a prediction for this event.");
          }
        } catch (contractError: any) {
          console.error("Event validation error:", contractError);
          // Re-throw with better message
          if (contractError.message) {
            throw contractError;
          }
          throw new Error(`Failed to validate event: ${contractError.message || "Unknown error"}`);
        }
      } catch (checkError: any) {
        // If it's already a user-friendly error, rethrow it
        if (checkError.message?.includes("does not exist") || 
            checkError.message?.includes("already submitted") ||
            checkError.message?.includes("not active") ||
            checkError.message?.includes("has ended") ||
            checkError.message?.includes("finalized")) {
          throw checkError;
        }
        console.warn("Could not verify event status:", checkError);
        // Continue anyway, let the contract handle the error
      }
      
      // Submit to contract
      await submitPrediction(eventId, handleHex as `0x${string}`, inputProofHex as `0x${string}`);
      
    } catch (error: any) {
      console.error("Error submitting prediction:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        data: error?.data,
        stack: error?.stack,
        cause: error?.cause,
        shortMessage: error?.shortMessage,
        reason: error?.reason,
      });
      
      let errorMsg = "Failed to submit prediction";
      
      // Try to extract meaningful error message from various error formats
      if (error?.reason) {
        errorMsg = error.reason;
      } else if (error?.message) {
        errorMsg = error.message;
      } else if (error?.data?.message) {
        errorMsg = error.data.message;
      } else if (error?.shortMessage) {
        errorMsg = error.shortMessage;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      
      // Check for common RPC errors and provide helpful messages
      if (errorMsg.includes("Internal JSON-RPC error") || errorMsg.includes("execution reverted")) {
        // Try to extract revert reason if available
        const revertReason = error?.cause?.reason || error?.cause?.data?.message || error?.data?.message;
        if (revertReason && !revertReason.includes("Internal JSON-RPC")) {
          errorMsg = revertReason;
        } else {
          errorMsg = "Transaction failed. Possible reasons:\n" +
            "• Event does not exist or is not active\n" +
            "• Event has ended or been finalized\n" +
            "• You already submitted a prediction\n" +
            "• Invalid FHE encryption proof\n" +
            "• Contract validation failed\n\n" +
            "Please check the browser console for more details.";
        }
      }
      
      // Check for specific FHE-related errors
      if (errorMsg.includes("fromExternal") || errorMsg.includes("inputProof") || errorMsg.includes("FHE") || errorMsg.includes("verifyCiphertext")) {
        errorMsg = "FHE encryption validation failed. The mock FHEVM proof cannot be verified by the contract.\n\n" +
          "To fix this:\n" +
          "1. Ensure Hardhat node is running with FHEVM plugin: `npx hardhat node`\n" +
          "2. The FHEVM contracts must be deployed and accessible\n" +
          "3. Try using a real FHEVM instance instead of the mock\n\n" +
          "Note: Mock FHEVM generates placeholder data that cannot pass contract validation.";
      }
      
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle successful submission
  useEffect(() => {
  if (isConfirmed) {
    toast.success("Prediction encrypted and submitted successfully!");
    onOpenChange(false);
    setPrice("");
      // Trigger refresh of event data
      onSuccess?.();
  }
  }, [isConfirmed, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-effect border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            Submit Encrypted Prediction
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {eventTitle}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price Prediction (USD)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="50000.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Enter your predicted price in USD. This will be encrypted locally using FHE before submission.
            </p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-primary" />
              <span className="font-medium">FHE Encryption Process</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your prediction will be encrypted locally using Fully Homomorphic Encryption (FHE) before submission. 
              The encrypted data is then sent to the blockchain where it can be aggregated and computed on-chain 
              without decryption. Results are only revealed after the prediction period ends.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 neon-border"
              disabled={isSubmitting || isPending || fhevmLoading || !fhevmInstance}
            >
              {fhevmLoading 
                ? "Initializing Encryption..." 
                : isSubmitting || isPending 
                ? "Encrypting & Submitting..." 
                : "Submit Prediction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PredictionModal;
