import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Lock, CheckCircle2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useCryptoPriceGuess } from "@/hooks/useCryptoPriceGuess";
import { useReadContract } from "wagmi";

interface AdminPanelProps {
  eventId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminPanel = ({ eventId, open, onOpenChange, ...props }: AdminPanelProps) => {
  const { address } = useAccount();
  const { getEventConfig, endEvent, setActualPrice, finalizeEvent, isPending, isConfirmed } = useCryptoPriceGuess();
  const { data: eventData, refetch: refetchEventData } = useReadContract(getEventConfig(eventId));
  const [actualPrice, setActualPriceValue] = useState("");
  
  // Refresh event data when operations complete
  useEffect(() => {
    if (isConfirmed) {
      // Wait a bit for the transaction to be mined
      setTimeout(() => {
        refetchEventData();
      }, 2000);
    }
  }, [isConfirmed, refetchEventData]);

  if (!eventData) {
    return null;
  }

  const isActive = eventData[4];
  const isFinalized = eventData[5];
  const admin = eventData[6] as string;
  const endTime = Number(eventData[3]) * 1000;
  const targetDate = Number(eventData[2]) * 1000;
  const currentTime = Date.now();

  const isAdmin = address && admin && address.toLowerCase() === admin.toLowerCase();
  const canEnd = isActive && currentTime >= endTime;
  const canSetPrice = !isActive && !isFinalized && currentTime >= targetDate && eventData[8] === 0n;
  const canFinalize = !isActive && !isFinalized && eventData[8] > 0n;

  const handleEndEvent = async () => {
    try {
      await endEvent(eventId);
      toast.success("Event ended successfully");
      // Refresh event data after a short delay
      setTimeout(() => {
        refetchEventData();
      }, 2000);
    } catch (error: any) {
      toast.error(error?.message || "Failed to end event");
    }
  };

  const handleSetActualPrice = async () => {
    const priceValue = parseFloat(actualPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    try {
      await setActualPrice(eventId, priceValue);
      toast.success("Actual price set successfully");
      setActualPriceValue("");
      // Refresh event data after a short delay
      setTimeout(() => {
        refetchEventData();
      }, 2000);
    } catch (error: any) {
      toast.error(error?.message || "Failed to set actual price");
    }
  };

  const handleFinalize = async () => {
    try {
      await finalizeEvent(eventId);
      toast.success("Finalization requested. Results will be decrypted shortly.");
      // Refresh event data after a longer delay to allow for decryption
      setTimeout(() => {
        refetchEventData();
        // Keep refreshing until finalized
        const interval = setInterval(() => {
          refetchEventData();
          if (eventData && eventData[5]) { // isFinalized
            clearInterval(interval);
          }
        }, 3000);
        // Stop after 30 seconds
        setTimeout(() => clearInterval(interval), 30000);
      }, 3000);
    } catch (error: any) {
      toast.error(error?.message || "Failed to finalize event");
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-effect border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Panel
          </DialogTitle>
          <DialogDescription>
            Manage prediction event: {eventData[0] || "Event"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Event Status */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`text-sm font-medium ${
                isFinalized ? "text-primary" : isActive ? "text-accent" : "text-muted-foreground"
              }`}>
                {isFinalized ? "Finalized" : isActive ? "Active" : "Ended"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Predictions</span>
              <span className="text-sm font-medium">{Number(eventData[7])}</span>
            </div>
          </div>

          {/* End Event */}
          {canEnd && (
            <div className="space-y-2">
              <Label>End Prediction Event</Label>
              <p className="text-xs text-muted-foreground">
                End the prediction period. Users can no longer submit predictions.
              </p>
              <Button
                onClick={handleEndEvent}
                disabled={isPending}
                variant="outline"
                className="w-full"
              >
                <Lock className="w-4 h-4 mr-2" />
                End Event
              </Button>
            </div>
          )}

          {/* Set Actual Price */}
          {canSetPrice && (
            <div className="space-y-2">
              <Label htmlFor="actualPrice">Set Actual Price (USD)</Label>
              <Input
                id="actualPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="50000.00"
                value={actualPrice}
                onChange={(e) => setActualPriceValue(e.target.value)}
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Set the actual price at the target date. This is required before finalization.
              </p>
              <Button
                onClick={handleSetActualPrice}
                disabled={isPending || !actualPrice}
                className="w-full"
              >
                Set Actual Price
              </Button>
            </div>
          )}

          {/* Finalize Event */}
          {canFinalize && (
            <div className="space-y-2">
              <Label>Finalize Event & Decrypt Results</Label>
              <p className="text-xs text-muted-foreground">
                Request decryption of encrypted predictions and calculate the average. This will reveal the results.
              </p>
              <Button
                onClick={handleFinalize}
                disabled={isPending}
                className="w-full neon-border"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Finalize & Decrypt
              </Button>
            </div>
          )}

          {/* Already Finalized */}
          {isFinalized && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Event Finalized
              </div>
              <div className="text-xs text-muted-foreground">
                Results have been decrypted and are now visible to all users.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminPanel;

