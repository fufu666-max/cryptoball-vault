import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAccount } from "wagmi";
import { useCryptoPriceGuess } from "@/hooks/useCryptoPriceGuess";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateEventModal = ({ open, onOpenChange }: CreateEventModalProps) => {
  const { address } = useAccount();
  const { createEvent, isPending, isConfirmed, refetchEventCount } = useCryptoPriceGuess();
  const [title, setTitle] = useState("");
  const [tokenType, setTokenType] = useState<"0" | "1">("0");
  const [targetDate, setTargetDate] = useState("");
  const [durationHours, setDurationHours] = useState("24");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!targetDate) {
      toast.error("Please select a target date");
      return;
    }

    // Parse datetime-local input (format: "YYYY-MM-DDTHH:mm")
    // datetime-local returns local time, so we need to parse it correctly
    let targetTimestamp: number;
    
    try {
      console.log("Parsing target date:", targetDate);
      
      // Create date from the datetime-local string
      // The string is in local time, so new Date() should handle it correctly
      const dateObj = new Date(targetDate);
      
      console.log("Parsed date object:", dateObj);
      console.log("Date timestamp:", dateObj.getTime());
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.error("Invalid date object:", dateObj);
        toast.error("Invalid target date. Please select a valid date and time.");
        return;
      }
      
      targetTimestamp = Math.floor(dateObj.getTime() / 1000);
      console.log("Target timestamp:", targetTimestamp);
      
      // Validate target timestamp
      if (isNaN(targetTimestamp) || targetTimestamp <= 0) {
        console.error("Invalid timestamp:", targetTimestamp);
        toast.error("Invalid target date. Please select a valid date and time.");
        return;
      }
    } catch (error) {
      console.error("Error parsing target date:", error, "Input:", targetDate);
      toast.error("Invalid target date format. Please select a valid date and time.");
      return;
    }
    
    const now = Math.floor(Date.now() / 1000);
    
    if (targetTimestamp <= now) {
      toast.error("Target date must be in the future");
      return;
    }

    const duration = parseInt(durationHours, 10);
    if (isNaN(duration) || duration <= 0) {
      toast.error("Please enter a valid duration");
      return;
    }

    const tokenTypeNum = parseInt(tokenType, 10);
    if (isNaN(tokenTypeNum) || (tokenTypeNum !== 0 && tokenTypeNum !== 1)) {
      toast.error("Invalid token type");
      return;
    }

    setHasSubmitted(true);
    try {
      console.log("Creating event with:", {
        title,
        tokenType: tokenTypeNum,
        targetTimestamp,
        duration,
      });
      await createEvent(title, tokenTypeNum, targetTimestamp, duration);
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
      setHasSubmitted(false);
    }
  };

  // Handle successful creation
  if (hasSubmitted && isConfirmed) {
    toast.success("Event created successfully!");
    refetchEventCount();
    onOpenChange(false);
    setTitle("");
    setTokenType("0");
    setTargetDate("");
    setDurationHours("24");
    setHasSubmitted(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-effect border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Plus className="w-6 h-6 text-primary" />
            Create Prediction Event
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              type="text"
              placeholder="BTC Price Prediction - Next Week"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenType">Token Type</Label>
            <Select value={tokenType} onValueChange={(value) => setTokenType(value as "0" | "1")}>
              <SelectTrigger>
                <SelectValue placeholder="Select token type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">BTC (Bitcoin)</SelectItem>
                <SelectItem value="1">ETH (Ethereum)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="datetime-local"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The date when the actual price will be set
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Prediction Period (Hours)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              placeholder="24"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              How long users can submit predictions
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 neon-border"
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventModal;

