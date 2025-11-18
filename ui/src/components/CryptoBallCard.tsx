import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gem, Zap, Vault, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useCryptoPriceGuess } from "@/hooks/useCryptoPriceGuess";

interface CryptoBallCardProps {
  ballId: number;
  ballType: number;
  generationTime: number;
  powerLevel: number;
  owner: string;
  isActive: boolean;
  onTransfer?: (ballId: number) => void;
}

const CryptoBallCard = ({
  ballId,
  ballType,
  generationTime,
  powerLevel,
  owner,
  isActive,
  onTransfer
}: CryptoBallCardProps) => {
  const { isConnected, address } = useAccount();
  const [isGenerating, setIsGenerating] = useState(false);
  const [transferAddress, setTransferAddress] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);

  const { generateCryptoBall, transferCryptoBall } = useCryptoPriceGuess();

  const getBallTypeInfo = (type: number) => {
    switch (type) {
      case 0:
        return { name: "Crystal Ball", icon: Gem, color: "text-purple-600", bgColor: "bg-purple-100" };
      case 1:
        return { name: "Prediction Ball", icon: Zap, color: "text-blue-600", bgColor: "bg-blue-100" };
      case 2:
        return { name: "Vault Ball", icon: Vault, color: "text-green-600", bgColor: "bg-green-100" };
      default:
        return { name: "Unknown Ball", icon: Gem, color: "text-gray-600", bgColor: "bg-gray-100" };
    }
  };

  const ballTypeInfo = getBallTypeInfo(ballType);
  const BallIcon = ballTypeInfo.icon;

  const handleGenerateBall = async (eventId: number) => {
    if (!isConnected) {
      toast.error("Please connect your wallet to generate CryptoBalls");
      return;
    }

    if (!address) {
      toast.error("Wallet address not available");
      return;
    }

    setIsGenerating(true);
    try {
      await generateCryptoBall(eventId);
      toast.success("CryptoBall generated successfully!");
    } catch (error: any) {
      console.error("Failed to generate ball:", error);

      // Enhanced error handling with specific messages
      if (error?.message?.includes("User must have submitted prediction")) {
        toast.error("You must submit a prediction for this event before generating a ball");
      } else if (error?.message?.includes("Event must be finalized")) {
        toast.error("Event must be finalized before generating balls");
      } else if (error?.message?.includes("User denied")) {
        toast.error("Transaction cancelled by user");
      } else if (error?.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds for transaction");
      } else {
        toast.error("Failed to generate CryptoBall: " + (error?.message || "Unknown error"));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAddress || !transferAddress.startsWith("0x")) {
      toast.error("Invalid address");
      return;
    }

    // Verify ownership before allowing transfer
    if (address !== owner) {
      toast.error("You are not the owner of this ball");
      return;
    }

    // Check if ball is active
    if (!isActive) {
      toast.error("Cannot transfer inactive ball");
      return;
    }

    try {
      await transferCryptoBall(ballId, transferAddress);
      toast.success("Ball transferred successfully!");
      setShowTransfer(false);
      setTransferAddress("");
    } catch (error) {
      console.error("Transfer failed:", error);
      toast.error("Transfer failed: " + (error as Error).message);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <Card className="w-full max-w-md mx-auto sm:max-w-sm md:max-w-md lg:max-w-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <BallIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${ballTypeInfo.color}`} />
            <span className="truncate">{ballTypeInfo.name}</span>
          </CardTitle>
          <Badge variant={isActive ? "default" : "secondary"} className="self-start sm:self-auto text-xs">
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          Generated on {formatTime(generationTime)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div className="bg-muted/50 p-2 sm:p-3 rounded-lg">
            <span className="font-medium block text-xs sm:text-sm">Ball ID:</span>
            <p className="text-muted-foreground font-mono text-sm sm:text-base">#{ballId}</p>
          </div>
          <div className="bg-muted/50 p-2 sm:p-3 rounded-lg">
            <span className="font-medium block text-xs sm:text-sm">Power Level:</span>
            <p className="text-muted-foreground text-sm sm:text-base">{powerLevel}</p>
          </div>
        </div>

        <div className="text-sm bg-muted/50 p-2 sm:p-3 rounded-lg">
          <span className="font-medium block text-xs sm:text-sm mb-1">Owner:</span>
          <p className="text-muted-foreground font-mono text-xs break-all leading-tight">
            {owner}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {address === owner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTransfer(!showTransfer)}
              className="w-full sm:flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              Transfer
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerateBall(0)} // BUG: Hardcoded event ID
            disabled={isGenerating}
            className="w-full sm:flex-1"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Generate
          </Button>
        </div>

        {showTransfer && (
          <div className="space-y-3 p-3 sm:p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={transferAddress}
                onChange={(e) => setTransferAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button size="sm" onClick={handleTransfer} className="flex-1 order-2 sm:order-1">
                Confirm Transfer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTransfer(false)}
                className="flex-1 order-1 sm:order-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CryptoBallCard;
