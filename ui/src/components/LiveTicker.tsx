import { CheckCircle2 } from "lucide-react";

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
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-primary/30 overflow-hidden py-3">
      <div className="flex items-center gap-8 animate-ticker whitespace-nowrap">
        {[...results, ...results].map((result, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">{result}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveTicker;
