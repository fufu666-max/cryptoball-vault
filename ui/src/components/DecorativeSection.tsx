import { Bitcoin, Coins, TrendingUp, Shield, Lock, Sparkles } from "lucide-react";

const DecorativeSection = () => {
  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-64 h-64 border border-primary/30 rounded-full animate-spin-slow" />
        <div className="absolute top-20 left-20 w-48 h-48 border border-accent/30 rounded-full animate-spin-slow-reverse" />
        <div className="absolute bottom-10 right-10 w-72 h-72 border border-encrypted/30 rounded-full animate-spin-slow" />
        <div className="absolute bottom-20 right-20 w-56 h-56 border border-primary/30 rounded-full animate-spin-slow-reverse" />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Stats showcase */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          <div className="glass-effect rounded-xl p-6 text-center group hover:scale-105 transition-all duration-500 hover:shadow-neon">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:animate-pulse">
              <Bitcoin className="w-8 h-8 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary mb-1 animate-count-up">$97K+</div>
            <div className="text-sm text-muted-foreground">BTC Price</div>
          </div>
          <div className="glass-effect rounded-xl p-6 text-center group hover:scale-105 transition-all duration-500 hover:shadow-encrypted">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-encrypted/20 to-primary/20 flex items-center justify-center group-hover:animate-pulse">
              <Coins className="w-8 h-8 text-encrypted" />
            </div>
            <div className="text-3xl font-bold text-encrypted mb-1">$3.4K+</div>
            <div className="text-sm text-muted-foreground">ETH Price</div>
          </div>
          <div className="glass-effect rounded-xl p-6 text-center group hover:scale-105 transition-all duration-500 hover:shadow-neon">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent/20 to-encrypted/20 flex items-center justify-center group-hover:animate-pulse">
              <TrendingUp className="w-8 h-8 text-accent" />
            </div>
            <div className="text-3xl font-bold text-accent mb-1">1000+</div>
            <div className="text-sm text-muted-foreground">Predictions</div>
          </div>
          <div className="glass-effect rounded-xl p-6 text-center group hover:scale-105 transition-all duration-500 hover:shadow-encrypted">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:animate-pulse">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary mb-1">100%</div>
            <div className="text-sm text-muted-foreground">Encrypted</div>
          </div>
        </div>

        {/* Decorative crypto visualization */}
        <div className="relative h-48 mb-16">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Central glow */}
            <div className="absolute w-32 h-32 bg-primary/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute w-24 h-24 bg-encrypted/30 rounded-full blur-2xl animate-pulse delay-500" />
            
            {/* Orbiting elements */}
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 border border-primary/20 rounded-full animate-spin-slow" />
              <div className="absolute inset-4 border border-accent/20 rounded-full animate-spin-slow-reverse" />
              <div className="absolute inset-8 border border-encrypted/20 rounded-full animate-spin-slow" />
              
              {/* Orbiting icons */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-orbit">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 animate-orbit-reverse">
                <div className="w-10 h-10 rounded-full bg-encrypted/20 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-5 h-5 text-encrypted" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech badges */}
        <div className="flex flex-wrap justify-center gap-4">
          {["FHE Encryption", "Zero Knowledge", "On-Chain Privacy", "Secure Compute", "Decentralized"].map((tech, i) => (
            <div
              key={tech}
              className="glass-effect px-4 py-2 rounded-full text-sm text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300 cursor-default animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {tech}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DecorativeSection;
