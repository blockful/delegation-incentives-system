import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { colors, radii, fontWeight, fontSize, space } from "@/theme";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: colors.blue,
    color: colors.backgroundPrimary,
    border: "none",
  },
  secondary: {
    background: colors.blueSurface,
    color: colors.blue,
    border: `1px solid ${colors.blueLight}`,
  },
  ghost: {
    background: "transparent",
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
  },
};

const hoverBg: Record<ButtonVariant, string> = {
  primary: colors.blueDim,
  secondary: colors.blueLight,
  ghost: colors.greySurface,
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "small" | "medium";
}

export function Button({
  variant = "primary",
  size = "medium",
  style,
  disabled,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const isSmall = size === "small";

  const baseStyle: CSSProperties = {
    ...variantStyles[variant],
    padding: isSmall ? `${space["2"]} ${space["4"]}` : `${space["3"]} ${space["6"]}`,
    borderRadius: radii.input,
    fontSize: isSmall ? fontSize.small : fontSize.body,
    fontWeight: fontWeight.bold,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background 150ms ease, opacity 150ms ease",
    display: "inline-flex",
    alignItems: "center",
    gap: space["2"],
    ...style,
  };

  return (
    <button
      style={baseStyle}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = hoverBg[variant];
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!disabled)
          e.currentTarget.style.background =
            variantStyles[variant].background as string;
        onMouseLeave?.(e);
      }}
      {...props}
    />
  );
}
