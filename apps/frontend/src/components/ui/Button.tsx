import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "primary-md" | "pill" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "h-[52px] rounded-r10 bg-primary text-white font-bold text-sm px-6 hover:bg-[#3D85F0] active:bg-[#2B6FD9] disabled:opacity-50",
  secondary:
    "h-[52px] rounded-r10 border border-border bg-white text-text-primary font-bold text-sm px-6 hover:bg-surface active:bg-border/30 disabled:opacity-50",
  "primary-md":
    "h-[44px] rounded-r8 bg-primary text-white font-bold text-sm px-5 hover:bg-[#3D85F0] active:bg-[#2B6FD9] disabled:opacity-50",
  pill: "h-[36px] rounded-rFull bg-primary text-white font-bold text-xs px-4 hover:bg-[#3D85F0] active:bg-[#2B6FD9] disabled:opacity-50",
  ghost:
    "text-primary font-bold text-sm hover:underline disabled:opacity-50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-colors cursor-pointer",
          variantStyles[variant],
          loading && "opacity-70 pointer-events-none",
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
