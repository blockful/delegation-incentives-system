import { colors } from "@/theme";

interface ENSLogoProps {
  size?: number;
}

/**
 * Simplified ENS logo mark — a rounded square with the "ENS" text.
 * Uses the official ENS blue brand color.
 */
export function ENSLogo({ size = 32 }: ENSLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ENS Logo"
    >
      <rect width="32" height="32" rx="6" fill={colors.blue} />
      <path
        d="M8.5 10.5C8.5 10.5 10.5 8 13.5 8C16 8 17 9.5 17 11.5C17 15 10 15.5 10 20H18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M14 24H23.5V12L19 16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
