import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  trigger?: "click" | "hover";
  height?: number | string;
}

export function FlipCard({
  front,
  back,
  className,
  trigger = "click",
  height = 200,
}: FlipCardProps) {
  const [flipped, setFlipped] = React.useState(false);
  const handlers =
    trigger === "click"
      ? { onClick: () => setFlipped((f) => !f) }
      : {
          onMouseEnter: () => setFlipped(true),
          onMouseLeave: () => setFlipped(false),
        };

  return (
    <div
      {...handlers}
      className={cn("relative w-full cursor-pointer select-none", className)}
      style={{ perspective: 1200, height }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 22 }}
      >
        <div
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: "hidden" }}
        >
          {front}
        </div>
        <div
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}
