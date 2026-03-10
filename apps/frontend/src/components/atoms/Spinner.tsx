import type { CSSProperties } from "react";
import { colors } from "@/theme";

interface SpinnerProps {
  size?: number;
}

export function Spinner({ size = 24 }: SpinnerProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    border: `3px solid ${colors.blueLight}`,
    borderTopColor: colors.blue,
    borderRadius: "50%",
    animation: "ens-spin 0.6s linear infinite",
  };

  return (
    <>
      <style>{`@keyframes ens-spin { to { transform: rotate(360deg) } }`}</style>
      <div style={style} role="status" aria-label="Loading" />
    </>
  );
}
