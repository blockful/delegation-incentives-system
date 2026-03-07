"use client";

import { Button } from "@/components/ui/Button";
import { useAccount } from "wagmi";
import { useMyApy, useMyEligibility } from "@/lib/queries";
import { formatPct } from "@/lib/format";
import Link from "next/link";

export function HeroSection() {
  const { isConnected } = useAccount();
  const { data: apy } = useMyApy();
  const { data: eligibility } = useMyEligibility();

  const isDelegated = eligibility?.eligible;

  return (
    <section className="py-sp-16 md:py-[96px]">
      <div className="max-w-2xl">
        <span className="text-label uppercase text-text-muted tracking-wider">
          ENS Governance · 90-Day Pilot
        </span>

        <h1 className="mt-sp-4 text-display md:text-[48px] md:leading-[52px] text-text-primary">
          {isConnected && apy
            ? `Earn ${formatPct(apy.estimatedApyPct)} APY on your ENS`
            : "Your ENS is sitting idle. It could be earning rewards."}
        </h1>

        <p className="mt-sp-4 text-body text-text-body max-w-lg">
          Delegate your ENS tokens to an active governance participant and earn
          monthly rewards. No lock-up, no gas fees to earn, withdraw anytime.
        </p>

        <div className="mt-sp-8 flex flex-wrap gap-sp-3">
          {isConnected && isDelegated ? (
            <Link href="/dashboard">
              <Button variant="primary">View Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/delegates">
                <Button variant="primary">
                  Delegate Now &rarr;
                </Button>
              </Link>
              <Link href="/transparency">
                <Button variant="secondary">How It Works</Button>
              </Link>
            </>
          )}
        </div>

        <div className="mt-sp-8 space-y-sp-2">
          {[
            "No lock-up period",
            "Rewards paid monthly in ENS",
            "Change delegate anytime",
          ].map((item) => (
            <div key={item} className="flex items-center gap-sp-2 text-body-sm text-text-body">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="8" fill="#DAFBE1" />
                <path
                  d="M5 8l2 2 4-4"
                  stroke="#1A7F37"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
