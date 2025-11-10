import EncryptedBox from "./EncryptedBox";
import { Trophy } from "lucide-react";

const Scoreboard = () => {
  const predictions = [
    { id: 1, username: "CryptoKing", prediction: "BTC $52,500", revealed: true },
    { id: 2, username: "MarketWiz", prediction: "ETH $3,200", revealed: true },
    { id: 3, username: "PredictPro", prediction: "BTC $51,800", revealed: false },
    { id: 4, username: "FutureSeer", prediction: "ETH $3,150", revealed: false },
    { id: 5, username: "DataMaster", prediction: "BTC $53,000", revealed: true },
    { id: 6, username: "OracleTech", prediction: "ETH $3,100", revealed: false },
  ];

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Trophy className="w-8 h-8 text-accent" />
              Live Scoreboard
            </h2>
            <p className="text-muted-foreground">
              BTC/ETH Price Prediction - Results being revealed
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Predictions</div>
            <div className="text-2xl font-bold text-primary">{predictions.length}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictions.map((pred) => (
            <EncryptedBox
              key={pred.id}
              username={pred.username}
              prediction={pred.prediction}
              revealed={pred.revealed}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Scoreboard;
