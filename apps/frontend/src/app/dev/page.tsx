"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { TierLadder } from "@/components/rounds/TierLadder";
import { HowItWorksCards } from "@/components/landing/HowItWorksCards";
import { HowDrawWorks } from "@/components/lottery/HowDrawWorks";
import { RewardSteps } from "@/components/transparency/RewardSteps";
import { ResourceCard } from "@/components/transparency/ResourceCard";
import { ContractsList } from "@/components/transparency/ContractsList";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-sp-4">
      <h2 className="text-h2 text-text-primary border-b border-border pb-sp-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DevPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [successOverlayOpen, setSuccessOverlayOpen] = useState(false);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-8 md:py-12 space-y-sp-16">
      <div>
        <h1 className="text-display text-text-primary">Design System</h1>
        <p className="mt-sp-2 text-body text-text-body">
          Component showcase for ENS Delegation Incentives
        </p>
      </div>

      {/* Typography */}
      <Section title="Typography">
        <div className="space-y-sp-4">
          <p className="text-display">Display — 36px / 900</p>
          <p className="text-h1">Heading 1 — 28px / 900</p>
          <p className="text-h2">Heading 2 — 22px / 700</p>
          <p className="text-h3">Heading 3 — 18px / 700</p>
          <p className="text-body text-text-body">
            Body — 17px / 400 — The quick brown fox jumps over the lazy dog.
          </p>
          <p className="text-body-sm text-text-body">
            Body Small — 14px / 400 — The quick brown fox jumps over the lazy
            dog.
          </p>
          <p className="text-label uppercase text-text-muted tracking-wider">
            Label — 11px / 700 / Uppercase
          </p>
          <p className="text-caption text-text-muted">
            Caption — 12px / 700
          </p>
        </div>
      </Section>

      {/* Colors */}
      <Section title="Colors">
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-sp-3">
          {[
            { name: "Primary", color: "bg-primary", hex: "#5298FF" },
            { name: "Text Primary", color: "bg-text-primary", hex: "#1F2328" },
            { name: "Text Body", color: "bg-text-body", hex: "#57606A" },
            { name: "Text Muted", color: "bg-text-muted", hex: "#8C959F" },
            { name: "Success", color: "bg-success", hex: "#1A7F37" },
            { name: "Success BG", color: "bg-success-bg", hex: "#DAFBE1" },
            { name: "Surface", color: "bg-surface", hex: "#F6F8FA" },
            { name: "Border", color: "bg-border", hex: "#D0D7DE" },
            { name: "Warning", color: "bg-warning", hex: "#CF6B00" },
          ].map(({ name, color, hex }) => (
            <div key={name} className="space-y-sp-1">
              <div
                className={`${color} w-full aspect-square rounded-r8 border border-border/50`}
              />
              <p className="text-caption text-text-primary">{name}</p>
              <p className="text-body-sm text-text-muted">{hex}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Spacing */}
      <Section title="Spacing Scale">
        <div className="space-y-sp-2">
          {[
            { name: "sp-1", px: "4px" },
            { name: "sp-2", px: "8px" },
            { name: "sp-3", px: "12px" },
            { name: "sp-4", px: "16px" },
            { name: "sp-5", px: "20px" },
            { name: "sp-6", px: "24px" },
            { name: "sp-8", px: "32px" },
            { name: "sp-10", px: "40px" },
            { name: "sp-12", px: "48px" },
            { name: "sp-16", px: "64px" },
          ].map(({ name, px }) => (
            <div key={name} className="flex items-center gap-sp-4">
              <span className="text-body-sm text-text-muted w-16">{name}</span>
              <div
                className="bg-primary/20 h-4 rounded"
                style={{ width: px }}
              />
              <span className="text-body-sm text-text-muted">{px}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <div className="space-y-sp-6">
          <div className="flex flex-wrap items-center gap-sp-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="primary-md">Primary MD</Button>
            <Button variant="pill">Pill</Button>
            <Button variant="ghost">Ghost Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-sp-4">
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button variant="primary" loading>
              Loading
            </Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>
        </div>
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <div className="space-y-sp-4">
          <div className="flex flex-wrap items-center gap-sp-3">
            <Badge variant="active">Active</Badge>
            <Badge variant="status" className="bg-success-bg text-success">
              Live
            </Badge>
            <Badge variant="status" className="bg-primary/10 text-primary">
              Paid
            </Badge>
            <Badge variant="status" className="bg-surface text-text-muted">
              Pending
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-sp-2">
            {[1, 2, 3, 4, 5].map((tier) => (
              <Badge key={tier} variant="tier" selected={tier === 2}>
                {tier}
              </Badge>
            ))}
          </div>
        </div>
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-sp-4">
          <Card variant="default">
            <p className="text-h3">Default Card</p>
            <p className="text-body-sm text-text-body mt-sp-2">
              Standard card with border
            </p>
          </Card>
          <Card variant="elevated">
            <p className="text-h3">Elevated Card</p>
            <p className="text-body-sm text-text-body mt-sp-2">
              Card with shadow for emphasis
            </p>
          </Card>
          <Card variant="surface">
            <p className="text-h3">Surface Card</p>
            <p className="text-body-sm text-text-body mt-sp-2">
              Subtle background card
            </p>
          </Card>
        </div>
      </Section>

      {/* StatCards */}
      <Section title="Stat Cards">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-sp-4">
          <Card>
            <StatCard label="Total Pool" value="10,000 ENS" />
          </Card>
          <Card>
            <StatCard
              label="Your APY"
              value="5.75%"
              description="Tier 2 rate"
            />
          </Card>
          <Card>
            <StatCard label="Active Delegates" value="47" />
          </Card>
          <Card>
            <StatCard
              label="Round Ends"
              value="14d 6h"
              description="March 31, 2026"
            />
          </Card>
        </div>
      </Section>

      {/* Progress Bars */}
      <Section title="Progress Bars">
        <div className="space-y-sp-4 max-w-lg">
          {[0, 33, 67, 100].map((value) => (
            <div key={value} className="space-y-sp-1">
              <div className="flex justify-between text-body-sm text-text-muted">
                <span>{value}%</span>
              </div>
              <ProgressBar value={value} />
            </div>
          ))}
        </div>
      </Section>

      {/* Modals */}
      <Section title="Modals">
        <div className="flex flex-wrap gap-sp-4">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Basic Modal
          </Button>
          <Button variant="secondary" onClick={() => setWalletModalOpen(true)}>
            Wallet Pending Modal
          </Button>
          <Button
            variant="secondary"
            onClick={() => setSuccessOverlayOpen(true)}
          >
            Delegation Success
          </Button>
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
          <h3 className="text-h2">Modal Title</h3>
          <p className="text-body text-text-body mt-sp-3">
            This is a responsive modal. On mobile it appears as a bottom sheet,
            on desktop it&apos;s centered.
          </p>
          <div className="flex gap-sp-3 mt-sp-6">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              Confirm
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </Modal>

        <Modal
          open={walletModalOpen}
          onClose={() => setWalletModalOpen(false)}
        >
          <div className="flex flex-col items-center text-center space-y-sp-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <h3 className="text-h2">Waiting for wallet confirmation</h3>
            <p className="text-body-sm text-text-body">
              Confirm the delegation transaction in your wallet.
            </p>
            <div className="flex items-center gap-sp-2 px-4 py-2 bg-surface rounded-r8">
              <div className="w-8 h-8 rounded-full bg-primary/20" />
              <div>
                <p className="text-body-sm font-bold text-text-primary">
                  nick.eth
                </p>
                <p className="text-caption text-text-muted">0x1234...5678</p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => setWalletModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </Modal>

        {successOverlayOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
            <div className="text-center space-y-sp-6 max-w-md px-sp-6">
              <div className="w-20 h-20 rounded-full bg-success-bg flex items-center justify-center mx-auto">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M8 16l6 6 10-10"
                    stroke="#1A7F37"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-h1">You&apos;re now delegated!</h2>
              <p className="text-body text-text-body">
                Delegated to <strong>nick.eth</strong>. Rewards start accruing
                next round.
              </p>
              <Button
                variant="primary"
                onClick={() => setSuccessOverlayOpen(false)}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </Section>

      {/* Skeletons */}
      <Section title="Skeletons">
        <div className="space-y-sp-3 max-w-sm">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-full" />
          <div className="flex gap-sp-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-sp-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ PAGE-LEVEL COMPONENTS ═══ */}

      <div className="border-t-4 border-primary pt-sp-8">
        <h1 className="text-display text-text-primary">Page Components</h1>
        <p className="mt-sp-2 text-body text-text-body">
          Composed components used across pages
        </p>
      </div>

      {/* Delegate Card (mock) */}
      <Section title="Delegate Card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sp-4">
          {[
            { name: "nick.eth", addr: "0xb8c2...a4d9", vp: "1.2M" },
            { name: "griff.eth", addr: "0x5e8f...c3b7", vp: "800K" },
            { name: "lefteris.eth", addr: "0x9a1d...e5f2", vp: "650K" },
          ].map((d) => (
            <Card key={d.name} className="space-y-sp-3">
              <div className="flex items-center gap-sp-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-caption font-bold text-primary">
                  {d.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-body font-bold text-text-primary">
                    {d.name}
                  </p>
                  <p className="text-caption text-text-muted">{d.addr}</p>
                </div>
                <Badge variant="active" className="ml-auto">
                  Active
                </Badge>
              </div>
              <div className="flex items-center gap-sp-2 text-body-sm text-text-muted">
                <span>9/10 votes</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-text-muted">
                  VP: <strong className="text-text-primary">{d.vp}</strong>
                </span>
              </div>
              <Button variant="primary-md" className="w-full">
                Delegate
              </Button>
            </Card>
          ))}
        </div>
      </Section>

      {/* Earnings Card (mock) */}
      <Section title="Earnings Card">
        <div className="max-w-xl">
          <Card className="space-y-sp-5">
            <span className="text-label uppercase text-text-muted tracking-wider">
              Your Earnings
            </span>
            <div>
              <span className="text-[40px] leading-tight font-black text-success">
                +0.0042
              </span>
              <p className="text-body-sm text-text-body mt-sp-1">
                ENS earned so far this round
              </p>
            </div>
            <div className="flex items-center gap-sp-2">
              <span className="text-body-sm text-text-body">
                Earning at{" "}
                <span className="font-bold text-text-primary">5.75% APY</span>
              </span>
              <Badge variant="tier" selected>
                2
              </Badge>
            </div>
            <div className="flex flex-wrap gap-sp-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-rFull bg-surface text-body-sm text-text-body">
                Delegating to nick.eth
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-rFull bg-surface text-body-sm text-text-body">
                24d left
              </span>
            </div>
          </Card>
        </div>
      </Section>

      {/* Tier Ladder (live data) */}
      <Section title="Tier Ladder">
        <div className="max-w-md">
          <Card>
            <TierLadder />
          </Card>
        </div>
      </Section>

      {/* How It Works Cards */}
      <Section title="How It Works Cards">
        <HowItWorksCards />
      </Section>

      {/* How Draw Works */}
      <Section title="How Draw Works (Lottery)">
        <HowDrawWorks />
      </Section>

      {/* Reward Steps */}
      <Section title="Reward Steps (Transparency)">
        <RewardSteps />
      </Section>

      {/* Resource Cards */}
      <Section title="Resource Cards">
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
            description="Full source code for the incentives system."
            href="#"
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
            description="Governance framework for program integrity."
            href="#"
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
            description="Live dashboards tracking delegation activity."
            href="#"
          />
        </div>
      </Section>

      {/* Contracts List */}
      <Section title="Contracts List">
        <ContractsList />
      </Section>

      {/* Lottery User Status (mock) */}
      <Section title="Lottery User Status">
        <div className="max-w-md">
          <Card className="space-y-sp-4">
            <div className="flex items-center justify-between">
              <span className="text-label uppercase text-text-muted tracking-wider">
                Your Status
              </span>
              <Badge variant="active">Qualified</Badge>
            </div>
            <div>
              <span className="text-h2 text-text-primary">Pool #14</span>
              <p className="text-body-sm text-text-muted mt-sp-1">
                ~3.2% chance of winning
              </p>
            </div>
            <div className="flex flex-wrap gap-sp-4">
              <div>
                <span className="text-caption text-text-muted block">
                  Pool Prize
                </span>
                <span className="text-body font-bold text-text-primary">
                  10.24 ENS
                </span>
              </div>
              <div>
                <span className="text-caption text-text-muted block">
                  Entries
                </span>
                <span className="text-body font-bold text-text-primary">
                  31
                </span>
              </div>
              <div>
                <span className="text-caption text-text-muted block">
                  Draw In
                </span>
                <span className="text-body font-bold text-text-primary">
                  24d
                </span>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* Round History (mock) */}
      <Section title="Round History Table">
        <Card>
          <span className="text-label uppercase text-text-muted tracking-wider">
            Round History
          </span>
          <div className="mt-sp-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-caption text-text-muted">
                  <th className="pb-sp-2 pr-sp-4 font-bold">Round</th>
                  <th className="pb-sp-2 pr-sp-4 font-bold">Period</th>
                  <th className="pb-sp-2 pr-sp-4 font-bold">Earned</th>
                  <th className="pb-sp-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    round: "Round 2",
                    period: "March 2026",
                    earned: "—",
                    live: true,
                  },
                  {
                    round: "Round 1",
                    period: "February 2026",
                    earned: "12.45 ENS",
                    live: false,
                  },
                ].map((r) => (
                  <tr key={r.round} className="border-t border-border">
                    <td className="py-sp-3 pr-sp-4 text-body-sm font-bold text-text-primary">
                      {r.round}
                    </td>
                    <td className="py-sp-3 pr-sp-4 text-body-sm text-text-body">
                      {r.period}
                    </td>
                    <td className="py-sp-3 pr-sp-4 text-body-sm text-text-primary font-bold">
                      {r.earned}
                    </td>
                    <td className="py-sp-3">
                      {r.live ? (
                        <Badge variant="active">Live</Badge>
                      ) : (
                        <Badge variant="status">Paid</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
    </div>
  );
}
