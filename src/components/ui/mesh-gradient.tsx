import { cn } from "@/lib/utils";

interface MeshGradientProps {
  className?: string;
}

/**
 * Brand-aligned animated mesh gradient.
 * Uses warm cream + slate tint + lime accent glow blobs.
 * Pure CSS animations — no JS loop. GPU-accelerated.
 */
export function MeshGradient({ className }: MeshGradientProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden bg-background pointer-events-none",
        className,
      )}
    >
      {/* Lime accent glow */}
      <div
        className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full opacity-40 blur-3xl animate-blob-drift"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--accent) / 0.55) 0%, transparent 65%)",
          willChange: "transform",
        }}
      />
      {/* Slate tint */}
      <div
        className="absolute top-1/3 -right-1/4 w-[55vw] h-[55vw] rounded-full opacity-30 blur-3xl animate-blob-drift-slow"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, transparent 65%)",
          willChange: "transform",
          animationDelay: "-20s",
        }}
      />
      {/* Cream highlight */}
      <div
        className="absolute -bottom-1/4 left-1/4 w-[50vw] h-[50vw] rounded-full opacity-50 blur-3xl animate-blob-drift-reverse"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--accent) / 0.3) 0%, transparent 60%)",
          willChange: "transform",
          animationDelay: "-40s",
        }}
      />
      {/* subtle grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
