import { cn } from "@/lib/cn";

interface PageContainerProps {
  className?: string;
  children: React.ReactNode;
}

export function PageContainer({ className, children }: PageContainerProps) {
  return (
    <div className={cn("max-w-[1440px] mx-auto px-4 md:px-8 py-8 md:py-12", className)}>
      {children}
    </div>
  );
}
