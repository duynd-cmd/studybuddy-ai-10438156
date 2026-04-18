import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  maxTilt?: number;
  glare?: boolean;
}

export const TiltCard = React.forwardRef<HTMLDivElement, TiltCardProps>(
  ({ className, children, maxTilt = 8, glare = true, ...props }, _ref) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const reduced = useReducedMotion();

    const mx = useMotionValue(0.5);
    const my = useMotionValue(0.5);
    const rx = useSpring(useTransform(my, [0, 1], [maxTilt, -maxTilt]), {
      stiffness: 200,
      damping: 20,
    });
    const ry = useSpring(useTransform(mx, [0, 1], [-maxTilt, maxTilt]), {
      stiffness: 200,
      damping: 20,
    });
    const glareX = useTransform(mx, (v) => `${v * 100}%`);
    const glareY = useTransform(my, (v) => `${v * 100}%`);

    const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduced || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      mx.set((e.clientX - rect.left) / rect.width);
      my.set((e.clientY - rect.top) / rect.height);
    };
    const reset = () => {
      mx.set(0.5);
      my.set(0.5);
    };

    return (
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        style={
          reduced
            ? undefined
            : { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", transformPerspective: 1000 }
        }
        className={cn("relative", className)}
        {...(props as any)}
      >
        {children}
        {glare && !reduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl mix-blend-overlay opacity-60"
            style={{
              background: useTransform(
                [glareX, glareY] as any,
                ([gx, gy]: any) =>
                  `radial-gradient(circle at ${gx} ${gy}, hsl(var(--accent) / 0.25), transparent 50%)`,
              ),
            }}
          />
        )}
      </motion.div>
    );
  },
);
TiltCard.displayName = "TiltCard";
