import { cn } from "@/lib/cn";

type BadgeVariant = "active" | "tier" | "status";

interface BadgeProps {
  variant?: BadgeVariant;
  selected?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  active:
    "bg-success-bg text-success rounded-rFull text-xs font-bold px-3 py-1",
  tier: "w-8 h-8 rounded-full border text-xs font-bold inline-flex items-center justify-center",
  status:
    "rounded-r6 text-label uppercase tracking-wider font-bold px-2 py-1",
};

export function Badge({
  variant = "active",
  selected,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        variantStyles[variant],
        variant === "tier" && selected && "bg-primary text-white border-primary",
        variant === "tier" && !selected && "border-border text-text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
