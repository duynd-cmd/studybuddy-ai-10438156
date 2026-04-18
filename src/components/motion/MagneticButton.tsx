import * as React from "react";
import { motion } from "framer-motion";
import { Button, ButtonProps } from "@/components/ui/button";
import { useMagnetic } from "@/hooks/useMagnetic";
import { cn } from "@/lib/utils";

interface MagneticButtonProps extends ButtonProps {
  strength?: number;
}

export const MagneticButton = React.forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ className, strength = 0.3, children, ...props }, _ref) => {
    const { ref, x, y, onMouseMove, onMouseLeave } = useMagnetic(strength);
    return (
      <motion.div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ x, y }}
        className="inline-block"
      >
        <Button className={cn("relative", className)} {...props}>
          {children}
        </Button>
      </motion.div>
    );
  },
);
MagneticButton.displayName = "MagneticButton";
