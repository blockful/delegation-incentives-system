"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";

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

      {/* Modal */}
      <Section title="Modal">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Open Modal
        </Button>
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
    </div>
  );
}
