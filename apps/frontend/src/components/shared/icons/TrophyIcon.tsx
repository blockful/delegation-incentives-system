interface TrophyIconProps {
  size?: number
  color?: string
}

export function TrophyIcon({ size = 24, color = 'currentColor' }: TrophyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 21h8M12 17v4M7 4H4a1 1 0 0 0-1 1v2a4 4 0 0 0 4 4h.5M17 4h3a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4h-.5"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 4h9v7a4.5 4.5 0 0 1-9 0V4Z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}
