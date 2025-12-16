import { Lock, Unlock, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface EncryptedBoxProps {
  prediction: string;
  revealed?: boolean;
  username: string;
  onReveal?: () => void;
}

const EncryptedBox = ({ prediction, revealed = false, username, onReveal }: EncryptedBoxProps) => {
  const [isRevealed, setIsRevealed] = useState(revealed);
  const [isRevealing, setIsRevealing] = useState(false);

  const handleReveal = () => {
    setIsRevealing(true);
    setTimeout(() => {
      setIsRevealed(true);
      setIsRevealing(false);
      onReveal?.();
    }, 600);
  };

  return (
    <div
      className={cn(
        "glass-effect rounded-xl p-4 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 group",
        isRevealed ? "neon-border animate-reveal" : "border-encrypted/30",
        isRevealing && "animate-encrypt scale-105"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{username}</span>
        {isRevealed ? (
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-accent animate-pulse" />
            <Unlock className="w-4 h-4 text-accent" />
          </div>
        ) : (
          <Lock className={cn(
            "w-4 h-4 text-encrypted transition-transform duration-300",
            isRevealing && "animate-spin"
          )} />
        )}
      </div>
      <div className="font-mono text-lg relative overflow-hidden">
        {isRevealed ? (
          <span className="text-accent animate-fade-in-up">{prediction}</span>
        ) : (
          <span className={cn(
            "text-encrypted select-none transition-all duration-300",
            isRevealing ? "blur-md opacity-50" : "blur-sm"
          )}>
            {prediction.split("").map((_, i) => "█").join("")}
          </span>
        )}
        {isRevealing && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" />
        )}
      </div>
      {!isRevealed && (
        <button
          onClick={handleReveal}
          disabled={isRevealing}
          className="mt-3 text-xs text-primary hover:text-accent transition-colors disabled:opacity-50"
        >
          {isRevealing ? "Decrypting..." : "Reveal after event ends"}
        </button>
      )}
    </div>
  );
};

export default EncryptedBox;
