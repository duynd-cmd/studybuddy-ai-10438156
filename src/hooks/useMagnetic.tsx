import { useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";
import { useReducedMotion } from "./useReducedMotion";

export function useMagnetic(strength = 0.35) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 15, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 150, damping: 15, mass: 0.3 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };
  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { ref, x: sx, y: sy, onMouseMove, onMouseLeave };
}
