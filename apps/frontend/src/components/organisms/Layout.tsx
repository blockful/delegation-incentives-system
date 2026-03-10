import type { CSSProperties, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { colors, space, fontSize, fontWeight, radii, shadows } from "@/theme";
import { ENSLogo } from "@/components/atoms/ENSLogo";

const headerStyle: CSSProperties = {
  background: colors.backgroundPrimary,
  borderBottom: `1px solid ${colors.border}`,
  padding: `${space["4"]} ${space["6"]}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: shadows.subtle,
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const logoArea: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: space["3"],
};

const brandText: CSSProperties = {
  fontSize: fontSize.large,
  fontWeight: fontWeight.extraBold,
  color: colors.textPrimary,
  letterSpacing: "-0.015em",
};

const navStyle: CSSProperties = {
  display: "flex",
  gap: space["1"],
};

const linkBase: CSSProperties = {
  padding: `${space["2"]} ${space["4"]}`,
  borderRadius: radii.input,
  fontSize: fontSize.small,
  fontWeight: fontWeight.bold,
  textDecoration: "none",
  transition: "background 150ms ease, color 150ms ease",
};

const mainStyle: CSSProperties = {
  maxWidth: "1120px",
  margin: "0 auto",
  padding: `${space["8"]} ${space["6"]}`,
};

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/eligibility", label: "Eligibility" },
  { to: "/tiers", label: "Tiers" },
  { to: "/distributions", label: "Distributions" },
];

export function Layout({ children }: LayoutProps) {
  return (
    <div>
      <header style={headerStyle}>
        <div style={logoArea}>
          <ENSLogo size={32} />
          <span style={brandText}>Delegation Incentives</span>
        </div>
        <nav style={navStyle}>
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                ...linkBase,
                background: isActive ? colors.blueSurface : "transparent",
                color: isActive ? colors.blue : colors.textSecondary,
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main style={mainStyle}>{children}</main>
    </div>
  );
}
