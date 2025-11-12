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
      toast.error("Connect wallet first");
      return;
    }

    setIsGenerating(true);
    try {
      await generateCryptoBall(eventId);
      toast.success("CryptoBall generated successfully!");
    } catch (error) {
      // BUG: Missing error handling - no proper error message or fallback
      console.error("Failed to generate ball:", error);
      toast.error("Failed to generate ball");
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BallIcon className={`w-6 h-6 ${ballTypeInfo.color}`} />
            {ballTypeInfo.name}
          </CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <CardDescription>
          Generated on {formatTime(generationTime)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Ball ID:</span>
            <p className="text-muted-foreground">#{ballId}</p>
          </div>
          <div>
            <span className="font-medium">Power Level:</span>
            <p className="text-muted-foreground">{powerLevel}</p>
          </div>
        </div>

        <div className="text-sm">
          <span className="font-medium">Owner:</span>
          <p className="text-muted-foreground font-mono text-xs break-all">
            {owner}
          </p>
        </div>

        <div className="flex gap-2">
          {address === owner && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransfer(!showTransfer)}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Transfer
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerateBall(0)} // BUG: Hardcoded event ID
            disabled={isGenerating}
            className="flex-1"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Generate
          </Button>
        </div>

        {showTransfer && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <input
              type="text"
              placeholder="Recipient address (0x...)"
              value={transferAddress}
              onChange={(e) => setTransferAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleTransfer} className="flex-1">
                Confirm Transfer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTransfer(false)}
                className="flex-1"
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
