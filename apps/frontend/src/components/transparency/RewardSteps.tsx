import { Card } from "@/components/ui/Card";

const steps = [
  {
    number: "1",
    title: "Balance snapshot",
    description:
      "At the start of each round, your 180-day time-weighted ENS balance is recorded. This ensures long-term holders benefit more than short-term movers.",
  },
  {
    number: "2",
    title: "Tier assignment",
    description:
      "The protocol tracks month-over-month voting power growth across all active delegates. Higher collective growth unlocks larger reward pools (7 tiers).",
  },
  {
    number: "3",
    title: "Payout at round end",
    description:
      "Rewards are distributed proportionally to delegators and delegates. Delegators below 1 ENS enter the lottery instead of receiving a direct payout.",
  },
];

export function RewardSteps() {
  return (
    <div className="space-y-sp-4">
      <span className="text-label uppercase text-text-muted tracking-wider">
        How Rewards Are Calculated
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-sp-4">
        {steps.map((step) => (
          <Card key={step.number} variant="surface">
            <span className="text-[28px] font-black text-primary/20">
              {step.number}
            </span>
            <h3 className="mt-sp-2 text-h3 text-text-primary">{step.title}</h3>
            <p className="mt-sp-2 text-body-sm text-text-body">
              {step.description}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
