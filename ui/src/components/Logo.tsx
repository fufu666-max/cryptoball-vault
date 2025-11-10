import { Lock } from "lucide-react";

const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        {/* Data cube */}
        <div className="w-10 h-10 bg-gradient-cyber rounded-lg rotate-45 border-2 border-primary/50 animate-glow-pulse">
          {/* Crystal ball inside */}
          <div className="absolute inset-0 flex items-center justify-center -rotate-45">
            <div className="w-6 h-6 bg-gradient-to-br from-encrypted to-primary rounded-full shadow-encrypted">
              <Lock className="w-4 h-4 text-background m-auto mt-1" />
            </div>
          </div>
        </div>
      </div>
      <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        CryptoBall Vault
      </span>
    </div>
  );
};

export default Logo;
