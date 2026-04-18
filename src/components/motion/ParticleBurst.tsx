import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Particle {
  id: number;
  x: number;
  y: number;
  rot: number;
  color: string;
  size: number;
}

const COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "hsl(var(--accent) / 0.7)",
  "hsl(var(--card-foreground))",
];

function makeParticles(n = 24): Particle[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 60 + Math.random() * 80;
    return {
      id: Date.now() + i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 20,
      rot: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      size: 4 + Math.random() * 6,
    };
  });
}

interface ParticleBurstProps {
  trigger: number;
  count?: number;
}

export function ParticleBurst({ trigger, count = 24 }: ParticleBurstProps) {
  const reduced = useReducedMotion();
  const [bursts, setBursts] = React.useState<{ id: number; particles: Particle[] }[]>([]);

  React.useEffect(() => {
    if (!trigger || reduced) return;
    const id = Date.now();
    setBursts((b) => [...b, { id, particles: makeParticles(count) }]);
    const t = setTimeout(() => {
      setBursts((b) => b.filter((x) => x.id !== id));
    }, 1300);
    return () => clearTimeout(t);
  }, [trigger, count, reduced]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
      <AnimatePresence>
        {bursts.map((burst) => (
          <div key={burst.id} className="relative">
            {burst.particles.map((p) => (
              <motion.span
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 1, rotate: p.rot }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "absolute",
                  width: p.size,
                  height: p.size,
                  background: p.color,
                  borderRadius: "2px",
                  boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                }}
              />
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useParticleBurst() {
  const [trigger, setTrigger] = React.useState(0);
  return { trigger, fire: () => setTrigger((t) => t + 1) };
}
