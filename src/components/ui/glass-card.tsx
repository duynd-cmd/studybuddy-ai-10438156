import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "elevated" | "interactive";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: "shadow-card",
  elevated: "shadow-lift",
  interactive: "shadow-card hover:shadow-lift transition-shadow duration-300",
};

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl",
          "before:bg-gradient-to-br before:from-foreground/[0.04] before:via-transparent before:to-accent/[0.06]",
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl",
          "after:shadow-[inset_0_1px_0_0_hsl(var(--card-foreground)/0.08)]",
          variants[variant],
          className,
        )}
        {...props}
      >
        <div className="relative z-10">{children}</div>
      </div>
    );
  },
);
GlassCard.displayName = "GlassCard";
