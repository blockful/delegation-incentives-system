import { Card } from "@/components/ui/Card";

const steps = [
  {
    number: "1",
    title: "Small rewards are pooled",
    description:
      "Delegators earning less than 1 ENS per month have their rewards grouped into pools of approximately 10 ENS each.",
  },
  {
    number: "2",
    title: "Random draw at month end",
    description:
      "At the end of each round, a provably random seed (RANDAO) selects one winner per pool. Every entry has an equal chance.",
  },
  {
    number: "3",
    title: "Winner takes the pool",
    description:
      "The selected winner receives the full pool amount (~10 ENS). All draws are verifiable on-chain.",
  },
];

export function HowDrawWorks() {
  return (
    <div className="space-y-sp-4">
      <span className="text-label uppercase text-text-muted tracking-wider">
        How the Draw Works
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
