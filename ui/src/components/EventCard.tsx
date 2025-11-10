import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Users, CheckCircle2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import PredictionModal from "./PredictionModal";
import AdminPanel from "./AdminPanel";
import { useCryptoPriceGuess } from "@/hooks/useCryptoPriceGuess";

interface EventCardProps {
  id: number;
  title: string;
  category: string;
  endDate: string;
  participants: number;
  status: "active" | "ended";
  isFinalized?: boolean;
  decryptedAveragePrice?: number;
  actualPrice?: number;
  admin?: string;
  onPredictionSuccess?: () => void;
}

const EventCard = ({ 
  id, 
  title, 
  category, 
  endDate, 
  participants, 
  status, 
  isFinalized, 
  decryptedAveragePrice, 
  actualPrice,
  admin,
  onPredictionSuccess
}: EventCardProps) => {
  const { isConnected, address } = useAccount();
  const [modalOpen, setModalOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const handlePredict = () => {
    if (!isConnected) {
      toast.info("Connect your wallet to submit a prediction");
      return;
    }
    setModalOpen(true);
  };

  // Format price from cents to USD
  const formatPrice = (priceInCents?: number) => {
    if (!priceInCents || priceInCents === 0) return "N/A";
    return `$${(priceInCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isAdmin = address && admin && address.toLowerCase() === admin.toLowerCase();
  
  // Debug: log admin check
  useEffect(() => {
    console.log("EventCard Debug:", {
      eventId: id,
      admin: admin,
      currentAddress: address,
      isAdmin: isAdmin,
      adminExists: !!admin,
      addressExists: !!address,
    });
  }, [id, admin, address, isAdmin]);

  return (
    <div className="glass-effect rounded-xl p-6 hover:shadow-neon transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs text-accent uppercase tracking-wider mb-1">
            {category}
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === "active"
              ? "bg-accent/20 text-accent"
              : isFinalized
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isFinalized ? "Finalized" : status === "active" ? "Live" : "Ended"}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{endDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{participants} predictions</span>
        </div>
      </div>

      {/* Show decrypted results if finalized */}
      {isFinalized && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="w-4 h-4" />
            <span>Results Decrypted</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Average Prediction</div>
              <div className="font-bold text-accent">
                {decryptedAveragePrice && decryptedAveragePrice > 0 
                  ? formatPrice(decryptedAveragePrice) 
                  : "Decrypting..."}
              </div>
            </div>
            {actualPrice && actualPrice > 0 ? (
              <div>
                <div className="text-muted-foreground">Actual Price</div>
                <div className="font-bold">{formatPrice(actualPrice)}</div>
              </div>
            ) : (
              <div>
                <div className="text-muted-foreground">Actual Price</div>
                <div className="font-bold text-muted-foreground">Not set</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
      <Button
        onClick={handlePredict}
          disabled={status === "ended" && !isFinalized}
          className="flex-1"
        variant={status === "active" ? "default" : "secondary"}
      >
          {status === "active" ? "Submit Prediction" : isFinalized ? "View Results" : "Event Ended"}
        </Button>
        {isAdmin && (
          <Button
            onClick={() => setAdminPanelOpen(true)}
            variant="outline"
            size="icon"
            title="Admin Panel"
            className="border-primary/50 hover:bg-primary/10 hover:border-primary"
          >
            <Shield className="w-4 h-4 text-primary" />
      </Button>
        )}
      </div>

      <PredictionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        eventTitle={title}
        eventId={id}
        onSuccess={onPredictionSuccess}
      />

      <AdminPanel
        eventId={id}
        open={adminPanelOpen}
        onOpenChange={(open) => {
          setAdminPanelOpen(open);
          // Refresh event data when admin panel closes
          if (!open && onPredictionSuccess) {
            onPredictionSuccess();
          }
        }}
      />
    </div>
  );
};

export default EventCard;
