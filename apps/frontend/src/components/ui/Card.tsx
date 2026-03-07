import { cn } from "@/lib/cn";

type CardVariant = "default" | "elevated" | "surface";

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: "rounded-r16 border border-border bg-white p-6",
  elevated:
    "rounded-r16 border border-border bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
  surface: "rounded-r16 bg-surface p-6",
};

export function Card({ variant = "default", className, children }: CardProps) {
  return (
    <div className={cn(variantStyles[variant], className)}>{children}</div>
  );
}
