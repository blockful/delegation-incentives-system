import { Card } from "@/components/ui/Card";

const STEPS = [
  {
    step: "01",
    title: "Delegate",
    description:
      "Choose an active governance delegate and delegate your ENS tokens. Free, no gas needed to earn.",
  },
  {
    step: "02",
    title: "Grow the Pool",
    description:
      "As more people delegate, the reward pool grows. Higher tiers unlock larger monthly distributions.",
  },
  {
    step: "03",
    title: "Earn Monthly",
    description:
      "Rewards are calculated based on your time-weighted balance and distributed at the end of each round.",
  },
  {
    step: "04",
    title: "Lottery Chance",
    description:
      "Holders with small balances are pooled into a lottery with a chance to win 10 ENS each round.",
  },
];

export function HowItWorksCards() {
  return (
    <section className="py-sp-16">
      <h2 className="text-h1 text-text-primary mb-sp-8">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sp-4">
        {STEPS.map(({ step, title, description }) => (
          <Card key={step} variant="default" className="flex flex-col gap-sp-3">
            <span className="text-label text-primary">{step}</span>
            <h3 className="text-h3 text-text-primary">{title}</h3>
            <p className="text-body-sm text-text-body">{description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
