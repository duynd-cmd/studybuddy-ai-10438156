import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiquidProgressProps {
  value: number; // 0-100
  size?: number;
  label?: string;
  className?: string;
}

/**
 * Circular progress with animated liquid wave fill.
 * SVG with clip-path defined by an animated wave path.
 */
export function LiquidProgress({
  value,
  size = 140,
  label,
  className,
}: LiquidProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillY = 100 - clamped; // 0 = top, 100 = bottom
  const id = React.useId().replace(/:/g, "");

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-0">
        <defs>
          <clipPath id={`circle-${id}`}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.95" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="hsl(var(--muted) / 0.4)"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        {/* Liquid layer */}
        <g clipPath={`url(#circle-${id})`}>
          <motion.g
            initial={false}
            animate={{ y: fillY }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
          >
            {/* Wave 1 */}
            <motion.path
              d="M-50,10 Q-25,0 0,10 T50,10 T100,10 T150,10 V120 H-50 Z"
              fill={`url(#grad-${id})`}
              animate={{ x: [0, -50] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
            {/* Wave 2 */}
            <motion.path
              d="M-50,12 Q-25,22 0,12 T50,12 T100,12 T150,12 V120 H-50 Z"
              fill="hsl(var(--accent) / 0.4)"
              animate={{ x: [0, 50] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
          </motion.g>
        </g>

        {/* Outer ring stroke */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.5"
          opacity="0.4"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading font-bold text-foreground" style={{ fontSize: size * 0.22 }}>
          {Math.round(clamped)}%
        </span>
        {label && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
