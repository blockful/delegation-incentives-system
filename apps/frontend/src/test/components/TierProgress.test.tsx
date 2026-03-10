import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TierProgress, type TierData } from "@/components/molecules";

const tiers: TierData[] = [
  {
    index: 0,
    momGrowthMinPct: "0",
    momGrowthMaxPct: "10",
    poolSizeEns: "5000",
    delegateCapEns: "50",
    delegatorCapEns: "250",
    isCurrent: true,
    isUnlocked: true,
  },
  {
    index: 1,
    momGrowthMinPct: "10",
    momGrowthMaxPct: "20",
    poolSizeEns: "8000",
    delegateCapEns: "80",
    delegatorCapEns: "400",
    isCurrent: false,
    isUnlocked: false,
  },
];

describe("TierProgress", () => {
  it("renders all tiers", () => {
    render(<TierProgress tiers={tiers} currentTierIndex={0} />);
    expect(screen.getByText(/Tier 1/)).toBeInTheDocument();
    expect(screen.getByText(/Tier 2/)).toBeInTheDocument();
  });

  it("marks current tier", () => {
    render(<TierProgress tiers={tiers} currentTierIndex={0} />);
    expect(screen.getByText(/\(Current\)/)).toBeInTheDocument();
  });

  it("shows pool sizes", () => {
    render(<TierProgress tiers={tiers} currentTierIndex={0} />);
    expect(screen.getByText("5000 ENS")).toBeInTheDocument();
    expect(screen.getByText("8000 ENS")).toBeInTheDocument();
  });

  it("shows growth ranges", () => {
    render(<TierProgress tiers={tiers} currentTierIndex={0} />);
    expect(screen.getByText("0% – 10% MoM growth")).toBeInTheDocument();
  });
});
