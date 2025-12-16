import { CheckCircle2, Sparkles } from "lucide-react";

const LiveTicker = () => {
  const results = [
    "BTC Price Prediction - Result Verified ✓",
    "ETH Price Prediction - Resolved ✓",
    "BTC Weekly Forecast - Result Confirmed ✓",
    "ETH Monthly Forecast - Verified ✓",
    "BTC Price Range - Result Posted ✓",
    "ETH Price Target - Confirmed ✓",
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-primary/30 overflow-hidden py-3 z-40">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-encrypted/5" />
      <div className="flex items-center gap-8 animate-ticker whitespace-nowrap relative">
        {[...results, ...results].map((result, index) => (
          <div key={index} className="flex items-center gap-2 text-sm group">
            <CheckCircle2 className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">{result}</span>
            <Sparkles className="w-3 h-3 text-primary/50" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveTicker;
