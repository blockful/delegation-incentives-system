# ENS UI Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the frontend look like a production ENS product by replacing custom styled-components with Thorin primitives, adding the real ENS logo, replacing emoji placeholders with Thorin SVG icons, and using Thorin's `Typography`, `Card`, `Profile`, and `Avatar` components throughout.

**Architecture:** Component-by-component replacement. Each task replaces one component or section with Thorin equivalents. No new features — purely visual/component migration. All existing tests must continue passing.

**Tech Stack:** React, styled-components, @ensdomains/thorin (Card, Typography, Heading, Avatar, Profile, Tag, Button, SVG icons), wagmi

---

## Thorin API Quick Reference (for implementers)

**Key components:**
- `Card` — `{ title?: string, children }` + `Card.Divider`
- `Typography` — `{ fontVariant, weight, color, font, ellipsis, asProp }` — fontVariant: `'body' | 'small' | 'extraSmall' | 'large' | 'extraLarge' | 'label' | 'labelHeading'`
- `Heading` — `{ level: '1' | '2', align, responsive, color }` + `as` prop for HTML element
- `Avatar` — `{ label, src?, shape?, noBorder? }`
- `Profile` — `{ address, ensName?, avatar?, size?: 'small' | 'medium' | 'large', dropdownItems? }`
- `Tag` — `{ colorStyle, size?: 'small' | 'medium' }`
- `Button` — `{ colorStyle, size, prefix?, suffix?, loading?, shape? }`

**SVG Icons (import from `@ensdomains/thorin`):**
`CheckSVG`, `LockSVG`, `PersonPlusSVG`, `HeartSVG`, `FlameSVG`, `EthSVG`, `WalletSVG`, `RightArrowSVG`, `UpRightArrowSVG`, `OutlinkSVG`, `CopySVG`, `ExitSVG`, `EnsSVG`, `CheckCircleSVG`, `InfoCircleSVG`

**Theme access:**
```tsx
${({ theme }) => theme.colors.text}         // primary text
${({ theme }) => theme.colors.textSecondary} // secondary text
${({ theme }) => theme.colors.textTertiary}  // muted text
${({ theme }) => theme.colors.border}        // borders
${({ theme }) => theme.colors.background}    // background
${({ theme }) => theme.colors.backgroundSecondary} // alt background
${({ theme }) => theme.colors.blue}          // ENS blue
${({ theme }) => theme.colors.green}         // success green
${({ theme }) => theme.colors.red}           // error red
```

---

## Task 1: Add ENS Logo SVG + Fix Header

The header currently has a fake gradient circle instead of the ENS logo. Replace with the real `EnsSVG` icon from Thorin. Replace the custom `AccountPill` with Thorin's `Profile` component. Use Thorin `Typography` for nav links.

**Files:**
- Modify: `apps/frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Replace gradient logo with EnsSVG**

Replace the `Logo` styled div with Thorin's `EnsSVG` icon:

```tsx
import { Button, EnsSVG } from '@ensdomains/thorin'
```

Remove the `Logo` styled component. In the JSX, replace `<Logo aria-hidden />` with:
```tsx
<EnsSVG style={{ width: 32, height: 32 }} />
```

- [ ] **Step 2: Replace AccountPill with Thorin Profile**

Replace the custom `ConnectedAccount` component and `AccountPill` styled component with:

```tsx
import { Profile } from '@ensdomains/thorin'
```

In the wallet area:
```tsx
{isConnected && address ? (
  <Profile
    address={address}
    ensName={ensName ?? undefined}
    avatar={avatarUrl ?? undefined}
    size="small"
    dropdownItems={[
      { label: 'Account', onClick: () => appKit.open(), icon: <WalletSVG /> },
      { label: 'Disconnect', onClick: () => disconnect(), color: 'red', icon: <ExitSVG /> },
    ]}
  />
) : (
  <Button size="small" colorStyle="bluePrimary" onClick={() => appKit.open()}>
    Connect Wallet
  </Button>
)}
```

This requires adding `useDisconnect` back from wagmi, and `useEnsAvatar` for the avatar URL.

- [ ] **Step 3: Use Typography for nav links**

Keep styled NavLink but use Thorin theme colors via `theme.colors.textSecondary` and `theme.colors.blue` for active state (already done from color audit).

- [ ] **Step 4: Run tests, commit**

```bash
cd apps/frontend && pnpm test
git commit -m "feat: add ENS logo to header, replace wallet pill with Thorin Profile"
```

---

## Task 2: Replace Emoji Icons with Thorin SVG Icons

Emojis are used as placeholder icons throughout. Replace with Thorin SVGs.

**Files:**
- Modify: `apps/frontend/src/pages/LandingPage/sections/HowItWorksSection.tsx`
- Modify: `apps/frontend/src/pages/LandingPage/sections/TierTableSection.tsx`
- Modify: `apps/frontend/src/pages/RoundsPage/components/TierTable.tsx`
- Modify: `apps/frontend/src/pages/LandingPage/sections/CtaSection.tsx`

- [ ] **Step 1: Replace HowItWorksSection emoji cards**

Current emojis → Thorin SVGs:
- `✍️` (Delegate) → `PersonPlusSVG`
- `📈` (Grow) → `FlameSVG`
- `💰` (Earn) → `EthSVG`
- `🏆` (Win) → `HeartSVG`

```tsx
import { PersonPlusSVG, FlameSVG, EthSVG, HeartSVG } from '@ensdomains/thorin'
```

Replace emoji spans with SVG components styled with appropriate size (24px) and color.

- [ ] **Step 2: Replace tier table lock/check emojis**

In TierTableSection.tsx and TierTable.tsx:
- `✓` / `✅` → `<CheckSVG />` (green)
- `🔒` → `<LockSVG />` (grey)

```tsx
import { CheckSVG, LockSVG } from '@ensdomains/thorin'
```

- [ ] **Step 3: Replace CtaSection checkmark emojis**

If there are `☑️` or similar, replace with `<CheckCircleSVG />`.

- [ ] **Step 4: Run tests, commit**

```bash
cd apps/frontend && pnpm test
git commit -m "fix: replace all emoji icons with Thorin SVG icons"
```

---

## Task 3: Migrate Cards to Thorin Card Component

Replace custom card styled-components with Thorin's `Card` component.

**Files:**
- Modify: `apps/frontend/src/pages/DelegatesPage/components/DelegateCard.tsx`
- Modify: `apps/frontend/src/pages/RoundsPage/components/RoundCard.tsx`
- Modify: `apps/frontend/src/pages/DashboardPage/sections/EarningsCard.tsx`
- Modify: `apps/frontend/src/pages/DashboardPage/sections/RoundProgressCard.tsx`
- Modify: `apps/frontend/src/pages/DashboardPage/sections/LotteryStatusCard.tsx`
- Modify: `apps/frontend/src/pages/DashboardPage/sections/RoundDetailsSection.tsx`

- [ ] **Step 1: Replace DelegateCard's custom Card div**

Replace:
```tsx
const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 20px;
  ...
`
```

With Thorin Card:
```tsx
import { Card } from '@ensdomains/thorin'

// In JSX, wrap content in <Card> instead of custom styled div
// Card provides border, border-radius, padding automatically
```

- [ ] **Step 2: Replace RoundCard's custom Card**

Same pattern — replace styled div with `<Card>`.

- [ ] **Step 3: Replace EarningsCard's custom Card**

The earnings card has a gradient background. Keep the gradient via a styled wrapper around Thorin Card, or use a styled Card override:
```tsx
const StyledCard = styled(Card)`
  background: linear-gradient(135deg, #CEE1E8 0%, #e8f5e9 100%);
`
```

- [ ] **Step 4: Replace RoundProgressCard, LotteryStatusCard, RoundDetailsSection cards**

Same pattern for each.

- [ ] **Step 5: Run tests, commit**

```bash
cd apps/frontend && pnpm test
git commit -m "feat: migrate all cards to Thorin Card component"
```

---

## Task 4: Migrate Typography to Thorin Heading/Typography

Replace raw `<h1>`, `<h2>`, `<p>` styled-components with Thorin's `Heading` and `Typography`.

**Files:**
- Modify: `apps/frontend/src/pages/LandingPage/sections/HeroSection.tsx`
- Modify: `apps/frontend/src/pages/LandingPage/sections/TierTableSection.tsx`
- Modify: `apps/frontend/src/pages/LandingPage/sections/HowItWorksSection.tsx`
- Modify: `apps/frontend/src/pages/LandingPage/sections/CtaSection.tsx`
- Modify: `apps/frontend/src/pages/DelegatesPage/index.tsx`
- Modify: `apps/frontend/src/pages/RoundsPage/index.tsx`

- [ ] **Step 1: Replace page headings with Thorin Heading**

Pattern for each page:
```tsx
// Before:
const Heading = styled.h1`
  font-size: 32px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
`
<Heading>Title</Heading>

// After:
import { Heading } from '@ensdomains/thorin'
<Heading level="2" responsive>Title</Heading>
```

Use `level="1"` for hero, `level="2"` for section headings.

- [ ] **Step 2: Replace body text with Typography**

```tsx
// Before:
const Description = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: #4A5C63;
`

// After:
import { Typography } from '@ensdomains/thorin'
<Typography fontVariant="body" color="textSecondary">...</Typography>
```

- [ ] **Step 3: Replace small labels with Typography**

```tsx
// Before:
const Label = styled.span`
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #0080BC;
`

// After:
<Typography fontVariant="label" color="blue" weight="bold">...</Typography>
```

- [ ] **Step 4: Run tests, commit**

```bash
cd apps/frontend && pnpm test
git commit -m "feat: migrate headings and text to Thorin Typography/Heading"
```

---

## Task 5: Fix Footer

Add ENS logo to footer, use Typography, clean up styling.

**Files:**
- Modify: `apps/frontend/src/components/layout/Footer.tsx`

- [ ] **Step 1: Add EnsSVG to footer brand**

```tsx
import { EnsSVG, Typography } from '@ensdomains/thorin'
```

Replace the `Title` and `Subtitle` with:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <EnsSVG style={{ width: 24, height: 24 }} />
  <Typography fontVariant="body" weight="bold">Incentives Program</Typography>
</div>
<Typography fontVariant="small" color="textTertiary">
  A security campaign for safer ENS governance
</Typography>
```

- [ ] **Step 2: Use Typography for footer links and attribution**

- [ ] **Step 3: Run tests, commit**

```bash
cd apps/frontend && pnpm test
git commit -m "feat: add ENS logo to footer, use Thorin Typography"
```

---

## Task 6: Replace EnsAvatar with Thorin Avatar

The current `EnsAvatar` is a custom component using wagmi + blockies. Replace with Thorin's `Avatar` component, keeping the wagmi hooks for data.

**Files:**
- Modify: `apps/frontend/src/components/shared/EnsAvatar.tsx`

- [ ] **Step 1: Rewrite EnsAvatar to wrap Thorin Avatar**

```tsx
import { Avatar } from '@ensdomains/thorin'
import { useEnsName, useEnsAvatar } from 'wagmi'
import makeBlockie from 'ethereum-blockies-base64'

export function EnsAvatar({ address, name, size = 32 }: EnsAvatarProps) {
  const { data: resolvedName } = useEnsName({
    address: address as `0x${string}`,
    query: { enabled: !name },
  })
  const ensName = name ?? resolvedName ?? undefined
  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    query: { enabled: !!ensName },
  })

  const src = avatarUrl ?? makeBlockie(address)

  return (
    <div style={{ width: size, height: size }}>
      <Avatar label={ensName ?? address} src={src} shape="circle" />
    </div>
  )
}
```

- [ ] **Step 2: Run tests, commit**

```bash
cd apps/frontend && pnpm test
git commit -m "feat: replace custom avatar with Thorin Avatar"
```

---

## Task 7: Visual QA Pass

After all component migrations, do a final pass to fix any visual inconsistencies.

**Files:** Any files that need adjustment after migration.

- [ ] **Step 1: Check each page renders correctly**

Visit each route and verify no broken layouts:
- `/` (Landing)
- `/delegates`
- `/dashboard`
- `/rounds`
- `/lottery`
- `/transparency`

- [ ] **Step 2: Fix any Thorin Card padding/spacing issues**

Thorin Card may have default padding that conflicts with existing inner padding. Adjust as needed.

- [ ] **Step 3: Fix any Typography sizing mismatches**

Thorin Typography fontVariants have fixed sizes. If any text is too large/small after migration, use the appropriate fontVariant.

- [ ] **Step 4: Run all tests, commit**

```bash
cd apps/frontend && pnpm test
cd apps/backend && pnpm test
git commit -m "fix: visual QA adjustments after Thorin migration"
```

---

## Task Order

```
Sequential (each builds on the previous):
  Task 1: Header (ENS logo + Profile) — most visible change
  Task 2: Replace emojis with SVG icons
  Task 3: Migrate cards to Thorin Card
  Task 4: Migrate typography to Thorin Heading/Typography
  Task 5: Footer
  Task 6: Avatar component
  Task 7: Visual QA pass
```

All tasks are frontend-only. No backend changes needed.
