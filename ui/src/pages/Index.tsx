import Logo from "@/components/Logo";
import WalletButton from "@/components/WalletButton";
import LiveTicker from "@/components/LiveTicker";
import Scoreboard from "@/components/Scoreboard";
import EventsList from "@/components/EventsList";
import Footer from "@/components/Footer";
import DecorativeSection from "@/components/DecorativeSection";
import FloatingParticles from "@/components/FloatingParticles";
import { ShieldCheck, Lock, Eye, ChevronDown } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-16 relative overflow-hidden">
      {/* Floating particles background - positioned within main container */}
      <FloatingParticles />

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80 animate-fade-in-up">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <WalletButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-cyber opacity-30"></div>
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-encrypted/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/10 rounded-full animate-spin-slow"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-accent/10 rounded-full animate-spin-slow-reverse"></div>
        </div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-glow-pulse animate-fade-in-up">
            Predict BTC/ETH Price Privately
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up stagger-2">
            Submit encrypted price predictions for Bitcoin and Ethereum. 
            Your predictions are encrypted with FHE before submission and remain private until the event ends.
          </p>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-subtle">
            <ChevronDown className="w-8 h-8 text-primary/50" />
          </div>

          {/* Process Flow */}
          <div className="mt-16 mb-8">
            <h2 className="text-2xl font-bold mb-6 animate-fade-in-up stagger-3">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-effect rounded-xl p-6 hover-glow animate-fade-in-up stagger-1 group">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-bold mb-2">Create</h3>
                <p className="text-sm text-muted-foreground">
                  Users submit prediction values
                </p>
              </div>
              <div className="glass-effect rounded-xl p-6 hover-glow animate-fade-in-up stagger-2 group">
                <div className="w-10 h-10 rounded-full bg-encrypted/20 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <span className="text-encrypted font-bold">2</span>
                </div>
                <h3 className="font-bold mb-2">Encrypt</h3>
                <p className="text-sm text-muted-foreground">
                  Encrypted locally using FHE before submission
                </p>
              </div>
              <div className="glass-effect rounded-xl p-6 hover-glow animate-fade-in-up stagger-3 group">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <span className="text-accent font-bold">3</span>
                </div>
                <h3 className="font-bold mb-2">Compute</h3>
                <p className="text-sm text-muted-foreground">
                  On-chain aggregation of prediction distribution and final error
                </p>
              </div>
              <div className="glass-effect rounded-xl p-6 hover-glow animate-fade-in-up stagger-4 group">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
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
            <div className="glass-effect rounded-xl p-6 hover-glow animate-fade-in-up stagger-1 group">
              <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-bold mb-2">Encrypted Until Reveal</h3>
              <p className="text-sm text-muted-foreground">
                Predictions locked with FHE encryption
              </p>
            </div>
            <div className="glass-effect rounded-xl p-6 hover-glow animate-fade-in-up stagger-2 group">
              <Lock className="w-12 h-12 text-encrypted mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-bold mb-2">Fair Competition</h3>
              <p className="text-sm text-muted-foreground">
                No copying, no cheating, pure skill
              </p>
            </div>
            <div className="glass-effect rounded-xl p-6 hover-glow animate-fade-in-up stagger-3 group">
              <Eye className="w-12 h-12 text-accent mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-bold mb-2">Transparent Results</h3>
              <p className="text-sm text-muted-foreground">
                Automatic verification and public reveal
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Decorative Section */}
      <DecorativeSection />

      {/* Scoreboard */}
      <Scoreboard />

      {/* Events List */}
      <div id="events-section">
        <EventsList />
      </div>

      {/* Footer */}
      <Footer />

      {/* Live Ticker */}
      <LiveTicker />
    </div>
  );
};

export default Index;
