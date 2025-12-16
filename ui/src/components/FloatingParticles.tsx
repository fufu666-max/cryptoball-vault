import { useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type: "circle" | "diamond" | "ring";
}

const FloatingParticles = () => {
  // Use useMemo instead of useState + useEffect to avoid hydration issues
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: (i * 17 + 5) % 100, // Deterministic positions
      y: (i * 23 + 10) % 100,
      size: (i % 4) + 3,
      duration: 15 + (i % 5) * 3,
      delay: (i % 4) * 1.5,
      type: (["circle", "diamond", "ring"] as const)[i % 3],
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-float-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          {particle.type === "circle" && (
            <div
              className="rounded-full bg-primary/20 blur-sm"
              style={{ width: particle.size, height: particle.size }}
            />
          )}
          {particle.type === "diamond" && (
            <div
              className="rotate-45 bg-encrypted/20 blur-sm"
              style={{ width: particle.size, height: particle.size }}
            />
          )}
          {particle.type === "ring" && (
            <div
              className="rounded-full border border-accent/30"
              style={{ width: particle.size * 2, height: particle.size * 2 }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default FloatingParticles;
