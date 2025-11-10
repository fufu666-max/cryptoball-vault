import Logo from "@/components/Logo";
import WalletButton from "@/components/WalletButton";
import LiveTicker from "@/components/LiveTicker";
import Scoreboard from "@/components/Scoreboard";
import EventsList from "@/components/EventsList";
import { ShieldCheck, Lock, Eye } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <WalletButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-cyber opacity-30"></div>
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-encrypted/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-glow-pulse">
            Predict BTC/ETH Price Privately
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Submit encrypted price predictions for Bitcoin and Ethereum. 
            Your predictions are encrypted with FHE before submission and remain private until the event ends.
          </p>

          {/* Process Flow */}
          <div className="mt-16 mb-8">
            <h2 className="text-2xl font-bold mb-6">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-effect rounded-xl p-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-bold mb-2">Create</h3>
                <p className="text-sm text-muted-foreground">
                  Users submit prediction values
                </p>
              </div>
              <div className="glass-effect rounded-xl p-6">
                <div className="w-10 h-10 rounded-full bg-encrypted/20 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-encrypted font-bold">2</span>
                </div>
                <h3 className="font-bold mb-2">Encrypt</h3>
                <p className="text-sm text-muted-foreground">
                  Encrypted locally using FHE before submission
                </p>
              </div>
              <div className="glass-effect rounded-xl p-6">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-accent font-bold">3</span>
                </div>
                <h3 className="font-bold mb-2">Compute</h3>
                <p className="text-sm text-muted-foreground">
                  On-chain aggregation of prediction distribution and final error
                </p>
              </div>
              <div className="glass-effect rounded-xl p-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-primary font-bold">4</span>
                </div>
                <h3 className="font-bold mb-2">Decrypt</h3>
                <p className="text-sm text-muted-foreground">
                  Admin/contract decrypts results and publishes scores after event ends
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="glass-effect rounded-xl p-6">
              <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">Encrypted Until Reveal</h3>
              <p className="text-sm text-muted-foreground">
                Predictions locked with FHE encryption
              </p>
            </div>
            <div className="glass-effect rounded-xl p-6">
              <Lock className="w-12 h-12 text-encrypted mx-auto mb-4" />
              <h3 className="font-bold mb-2">Fair Competition</h3>
              <p className="text-sm text-muted-foreground">
                No copying, no cheating, pure skill
              </p>
            </div>
            <div className="glass-effect rounded-xl p-6">
              <Eye className="w-12 h-12 text-accent mx-auto mb-4" />
              <h3 className="font-bold mb-2">Transparent Results</h3>
              <p className="text-sm text-muted-foreground">
                Automatic verification and public reveal
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scoreboard */}
      <Scoreboard />

      {/* Events List */}
      <div id="events-section">
        <EventsList />
      </div>

      {/* Live Ticker */}
      <LiveTicker />
    </div>
  );
};

export default Index;
