import type { CSSProperties, ReactNode } from "react";
import { colors, radii, shadows, space } from "@/theme";

export interface CardProps {
  children: ReactNode;
  padding?: keyof typeof space;
  shadow?: keyof typeof shadows;
  style?: CSSProperties;
  className?: string;
  "data-testid"?: string;
}

export function Card({
  children,
  padding = "6",
  shadow = "card",
  style,
  className,
  "data-testid": testId,
}: CardProps) {
  const cardStyle: CSSProperties = {
    background: colors.backgroundPrimary,
    borderRadius: radii.card,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows[shadow],
    padding: space[padding],
    ...style,
  };

  return (
    <div style={cardStyle} className={className} data-testid={testId}>
      {children}
    </div>
  );
}
