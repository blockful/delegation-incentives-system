import type { InputHTMLAttributes, CSSProperties } from "react";
import { colors, radii, fontSize, fontWeight, space, shadows } from "@/theme";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  const wrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: space["2"],
  };

  const labelStyle: CSSProperties = {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  };

  const inputStyle: CSSProperties = {
    padding: `${space["3"]} ${space["4"]}`,
    borderRadius: radii.input,
    border: `1px solid ${error ? colors.red : colors.border}`,
    fontSize: fontSize.body,
    fontWeight: fontWeight.normal,
    color: colors.textPrimary,
    background: colors.backgroundPrimary,
    outline: "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    ...style,
  };

  const errorStyle: CSSProperties = {
    fontSize: fontSize.extraSmall,
    color: colors.red,
  };

  return (
    <div style={wrapperStyle}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={inputStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = colors.blue;
          e.currentTarget.style.boxShadow = shadows.focus;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? colors.red : colors.border;
          e.currentTarget.style.boxShadow = "none";
        }}
        {...props}
      />
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  );
}
