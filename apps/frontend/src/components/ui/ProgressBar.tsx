import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 w-full bg-surface rounded-rFull overflow-hidden", className)}>
      <div
        className="h-full bg-primary rounded-rFull transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
