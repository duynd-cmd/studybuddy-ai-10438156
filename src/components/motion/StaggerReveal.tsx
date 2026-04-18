import * as React from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface StaggerRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  stagger?: number;
  delay?: number;
  once?: boolean;
}

const containerVariants = (stagger: number, delay: number): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 28 },
  },
};

export function StaggerReveal({
  className,
  children,
  stagger = 0.08,
  delay = 0,
  once = true,
  ...props
}: StaggerRevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.15 }}
      variants={containerVariants(stagger, delay)}
      className={className}
      {...(props as any)}
    >
      {React.Children.map(children, (child, i) => (
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export const StaggerItem = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <motion.div variants={itemVariants} className={cn(className)} {...(props as any)}>
    {children}
  </motion.div>
);
