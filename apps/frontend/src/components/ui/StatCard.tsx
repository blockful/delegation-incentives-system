import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  className?: string;
}

export function StatCard({ label, value, description, className }: StatCardProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-label uppercase text-text-muted tracking-wider">
        {label}
      </span>
      <span className="text-h2 text-text-primary">{value}</span>
      {description && (
        <span className="text-body-sm text-text-body">{description}</span>
      )}
    </div>
  );
}
