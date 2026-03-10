import type { CSSProperties, ElementType, ReactNode } from "react";
import { fontSize, fontWeight, lineHeight, colors } from "@/theme";

type Variant =
  | "headingOne"
  | "headingTwo"
  | "headingThree"
  | "headingFour"
  | "extraLarge"
  | "large"
  | "body"
  | "small"
  | "extraSmall";

type Weight = "light" | "normal" | "bold" | "extraBold";

type Color = "primary" | "secondary" | "tertiary" | "blue" | "green" | "red" | "inherit";

const colorMap: Record<Color, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  blue: colors.blue,
  green: colors.green,
  red: colors.red,
  inherit: "inherit",
};

const defaultTag: Record<Variant, ElementType> = {
  headingOne: "h1",
  headingTwo: "h2",
  headingThree: "h3",
  headingFour: "h4",
  extraLarge: "p",
  large: "p",
  body: "p",
  small: "p",
  extraSmall: "span",
};

export interface TypographyProps {
  variant?: Variant;
  weight?: Weight;
  color?: Color;
  as?: ElementType;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  "data-testid"?: string;
}

export function Typography({
  variant = "body",
  weight = "normal",
  color = "primary",
  as,
  children,
  style,
  className,
  "data-testid": testId,
}: TypographyProps) {
  const Tag = as ?? defaultTag[variant];

  const combinedStyle: CSSProperties = {
    fontSize: fontSize[variant],
    fontWeight: fontWeight[weight],
    lineHeight: lineHeight[variant],
    color: colorMap[color],
    margin: 0,
    ...style,
  };

  return (
    <Tag style={combinedStyle} className={className} data-testid={testId}>
      {children}
    </Tag>
  );
}
