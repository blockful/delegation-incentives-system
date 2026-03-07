"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { ResourceCard } from "@/components/transparency/ResourceCard";
import { ContractsList } from "@/components/transparency/ContractsList";
import { RewardSteps } from "@/components/transparency/RewardSteps";
import { LiveDataGrid } from "@/components/transparency/LiveDataGrid";

export default function TransparencyPage() {
  return (
    <PageContainer>
      <div className="space-y-sp-10">
        {/* Header */}
        <div>
          <span className="text-label uppercase text-text-muted tracking-wider">
            Open &amp; Verifiable
          </span>
          <h1 className="mt-sp-4 text-display md:text-[48px] md:leading-[52px] text-text-primary">
            Verify everything on-chain.
          </h1>
          <p className="mt-sp-4 text-body text-text-body max-w-lg">
            Every reward calculation, lottery draw, and distribution is
            transparent and verifiable. Explore the data, read the code, and
            verify on-chain.
          </p>
        </div>

        {/* Resource cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-sp-4">
          <ResourceCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            title="GitHub"
            description="Full source code for the incentives system, indexer, and distribution engine."
            href="https://github.com/blockful/delegation-incentives-system"
          />
          <ResourceCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            title="Anticapture"
            description="Governance framework ensuring no single entity can capture the incentives program."
            href="https://anticapture.xyz"
          />
          <ResourceCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 20V10M12 20V4M6 20v-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            title="Dune Analytics"
            description="Live dashboards tracking delegation activity, reward distributions, and growth metrics."
            href="https://dune.com"
          />
        </div>

        {/* Live data */}
        <LiveDataGrid />

        {/* Contracts */}
        <ContractsList />

        {/* Reward steps */}
        <RewardSteps />
      </div>
    </PageContainer>
  );
}
