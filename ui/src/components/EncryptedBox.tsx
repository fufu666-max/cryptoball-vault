import { Lock, Unlock } from "lucide-react";
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

  const handleReveal = () => {
    setIsRevealed(true);
    onReveal?.();
  };

  return (
    <div
      className={cn(
        "glass-effect rounded-xl p-4 transition-all duration-500",
        isRevealed ? "neon-border animate-reveal" : "border-encrypted/30 animate-encrypt"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{username}</span>
        {isRevealed ? (
          <Unlock className="w-4 h-4 text-accent" />
        ) : (
          <Lock className="w-4 h-4 text-encrypted" />
        )}
      </div>
      <div className="font-mono text-lg">
        {isRevealed ? (
          <span className="text-accent">{prediction}</span>
        ) : (
          <span className="text-encrypted blur-sm select-none">
            {prediction.split("").map((_, i) => "█").join("")}
          </span>
        )}
      </div>
      {!isRevealed && (
        <button
          onClick={handleReveal}
          className="mt-3 text-xs text-primary hover:text-accent transition-colors"
        >
          Reveal after event ends
        </button>
      )}
    </div>
  );
};

export default EncryptedBox;
