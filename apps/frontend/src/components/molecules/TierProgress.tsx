import type { CSSProperties } from "react";
import { colors, radii, space, fontSize, fontWeight } from "@/theme";
import { Typography } from "@/components/atoms";

export interface TierData {
  index: number;
  momGrowthMinPct: string;
  momGrowthMaxPct: string;
  poolSizeEns: string;
  delegateCapEns: string;
  delegatorCapEns: string;
  isCurrent: boolean;
  isUnlocked: boolean;
}

export interface TierProgressProps {
  tiers: TierData[];
  currentTierIndex: number;
  "data-testid"?: string;
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space["3"],
};

const tierRow = (isActive: boolean, isUnlocked: boolean): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: space["4"],
  alignItems: "center",
  padding: `${space["3"]} ${space["4"]}`,
  borderRadius: radii.large,
  background: isActive
    ? colors.blueSurface
    : isUnlocked
      ? colors.backgroundPrimary
      : colors.greySurface,
  border: isActive
    ? `2px solid ${colors.blue}`
    : `1px solid ${colors.border}`,
  opacity: isUnlocked || isActive ? 1 : 0.6,
  transition: "all 150ms ease",
});

const dotStyle = (isActive: boolean, isUnlocked: boolean): CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: isActive ? colors.blue : isUnlocked ? colors.green : colors.grey,
  flexShrink: 0,
});

const poolStyle: CSSProperties = {
  fontSize: fontSize.small,
  fontWeight: fontWeight.bold,
  color: colors.textPrimary,
  textAlign: "right",
};

export function TierProgress({
  tiers,
  currentTierIndex,
  "data-testid": testId,
}: TierProgressProps) {
  return (
    <div style={containerStyle} data-testid={testId}>
      {tiers.map((tier) => (
        <div
          key={tier.index}
          style={tierRow(tier.isCurrent, tier.isUnlocked)}
          data-testid={`tier-${tier.index}`}
        >
          <div style={dotStyle(tier.isCurrent, tier.isUnlocked)} />
          <div>
            <Typography
              variant="small"
              weight="bold"
              color={tier.isCurrent ? "blue" : "primary"}
            >
              Tier {tier.index + 1}
              {tier.isCurrent ? " (Current)" : ""}
            </Typography>
            <Typography variant="extraSmall" color="secondary">
              {tier.momGrowthMinPct}% – {tier.momGrowthMaxPct}% MoM growth
            </Typography>
          </div>
          <div style={poolStyle}>{tier.poolSizeEns} ENS</div>
        </div>
      ))}
    </div>
  );
}
