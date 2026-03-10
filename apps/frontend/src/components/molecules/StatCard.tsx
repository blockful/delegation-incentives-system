import type { CSSProperties, ReactNode } from "react";
import { Card } from "@/components/atoms";
import { Typography } from "@/components/atoms";
import { space } from "@/theme";

export interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: ReactNode;
  "data-testid"?: string;
}

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space["2"],
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: space["3"],
};

export function StatCard({
  label,
  value,
  suffix,
  icon,
  "data-testid": testId,
}: StatCardProps) {
  return (
    <Card padding="5" data-testid={testId}>
      <div style={contentStyle}>
        <Typography variant="small" color="secondary" weight="bold">
          {label}
        </Typography>
        <div style={rowStyle}>
          {icon}
          <Typography variant="headingThree" weight="extraBold">
            {value}
            {suffix && (
              <Typography
                variant="large"
                color="secondary"
                weight="normal"
                as="span"
              >
                {" "}
                {suffix}
              </Typography>
            )}
          </Typography>
        </div>
      </div>
    </Card>
  );
}
