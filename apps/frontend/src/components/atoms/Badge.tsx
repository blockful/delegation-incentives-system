import type { CSSProperties, ReactNode } from "react";
import { colors, radii, fontSize, fontWeight, space } from "@/theme";

type BadgeVariant = "blue" | "green" | "red" | "yellow" | "grey";

const variantStyles: Record<BadgeVariant, CSSProperties> = {
  blue: { background: colors.blueSurface, color: colors.blueDim },
  green: { background: colors.greenSurface, color: colors.greenBright },
  red: { background: colors.redSurface, color: colors.red },
  yellow: { background: colors.yellowSurface, color: colors.yellow },
  grey: { background: colors.greySurface, color: colors.greyPrimary },
};

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  "data-testid"?: string;
}

export function Badge({
  variant = "grey",
  children,
  "data-testid": testId,
}: BadgeProps) {
  const style: CSSProperties = {
    ...variantStyles[variant],
    display: "inline-flex",
    alignItems: "center",
    padding: `${space["1"]} ${space["3"]}`,
    borderRadius: radii.full,
    fontSize: fontSize.extraSmall,
    fontWeight: fontWeight.bold,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  return (
    <span style={style} data-testid={testId}>
      {children}
    </span>
  );
}
