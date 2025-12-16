import { Shield, Lock, Eye, Github, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative py-16 px-4 border-t border-border/30 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-encrypted/5 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield className="w-6 h-6 text-background" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                CryptoBall Vault
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Private crypto price predictions powered by Fully Homomorphic Encryption.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Features</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2 hover:text-primary transition-colors">
                <Lock className="w-4 h-4" /> End-to-end Encryption
              </li>
              <li className="flex items-center gap-2 hover:text-primary transition-colors">
                <Eye className="w-4 h-4" /> Private Predictions
              </li>
              <li className="flex items-center gap-2 hover:text-primary transition-colors">
                <Shield className="w-4 h-4" /> Secure Computation
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Connect</h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-lg glass-effect flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all duration-300"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg glass-effect flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all duration-300"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 CryptoBall Vault. Built with FHE technology.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Powered by Zama fhEVM
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
