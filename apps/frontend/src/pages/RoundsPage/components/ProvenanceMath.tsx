import styled from 'styled-components'
import type { AddressRoundReward, RoundDetailResponse } from '@/api/types'
import { tokens } from '@/styles'
import { formatEnsAmount, formatEnsCompact } from '@/utils/format'
import {
  buildCapLedger,
  reconcileProvenance,
  sourceLabel,
  type AddressRewardProvenance,
  type CapLedgerView,
  type CapStatus,
  type ProvenanceRole,
  type TokenHolderProvenance,
  type VoterProvenance,
} from './provenance'

/* ─── "The math behind your X ENS" (DEV-764, board 5624:153) ───────────────
 *
 * Full-width expansion under the check-wallet card: per-role math (delegate
 * portion over the round month, holder portion over the trailing 180 days),
 * a cap ledger per role (boards 5624:229 / 238 / 278), the lottery draw when
 * the wallet entered one, the round inputs, and a BigInt reconciliation line.
 */

// Figma "Light/Green/Bright" — also used by the summary's earned amount.
const BRIGHT_GREEN = '#1eb789'

/* ─── Layout ─── */

const MathCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  padding: ${tokens.spacing['2xl']};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 16px;
`

const MathTitle = styled.h4`
  margin: 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 24px;
`

const RoleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  width: 100%;
`

const RoleDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
`

const RoleName = styled.span`
  flex: 1;
  min-width: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const RoleAmount = styled.span<{ $color: string }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $color }) => $color};
  line-height: 20px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const KvList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  width: 100%;
`

const KvRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.spacing.md};
  width: 100%;
`

const KvLabelGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
`

const KvLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const KvHint = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 16px;
`

const KvValue = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${tokens.color.borderLight};
`

const BlockTitle = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 16px;
`

/* ─── Sources list ─── */

const SourceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  width: 100%;
  padding-top: ${tokens.spacing.xs};
`

const SourceItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
`

const SourceBullet = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  flex-shrink: 0;
  margin-top: 5px;
  background: ${BRIGHT_GREEN};
`

const SourceText = styled.span`
  flex: 1;
  min-width: 0;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 16px;
`

/* ─── Cap ledger (boards 5624:229 / 5624:238 / 5624:278) ─── */

const LedgerCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  width: 100%;
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const LedgerTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const LedgerStatus = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  width: 100%;
  padding: ${tokens.spacing.md} 14px;
  background: ${tokens.color.status.success.bg};
  border-radius: 10px;
`

const LedgerStatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  flex-shrink: 0;
  background: ${tokens.color.status.success.fg};
`

const LedgerStatusText = styled.span`
  flex: 1;
  min-width: 0;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 16px;
`

const LedgerTable = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 10px;
  overflow: hidden;
`

const LedgerRow = styled.div<{ $final?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  width: 100%;
  padding: 9px ${tokens.spacing.md};
  background: ${({ $final }) => ($final ? tokens.color.surfaceAlt : 'transparent')};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }
`

const LedgerLabelCell = styled.div<{ $bold?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  flex: 1;
  min-width: 0;
  font-size: ${tokens.font.size.sm};
  font-weight: ${({ $bold }) =>
    $bold ? tokens.font.weight.bold : tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 16px;
`

const LedgerTag = styled.span<{ $tone: 'success' | 'danger' }>`
  display: inline-flex;
  padding: 2px ${tokens.spacing.sm};
  border-radius: 6px;
  background: ${({ $tone }) => tokens.color.status[$tone].bg};
  color: ${({ $tone }) => tokens.color.status[$tone].fg};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  white-space: nowrap;
`

const LedgerDeltaCell = styled.span<{ $tone?: 'success' | 'danger' }>`
  width: 66px;
  text-align: right;
  flex-shrink: 0;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $tone }) => ($tone ? tokens.color.status[$tone].fg : tokens.color.darkGray)};
  line-height: 16px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const LedgerRunningCell = styled.span<{ $bold?: boolean }>`
  width: 92px;
  text-align: right;
  flex-shrink: 0;
  font-size: ${tokens.font.size.sm};
  font-weight: ${({ $bold }) =>
    $bold ? tokens.font.weight.bold : tokens.font.weight.medium};
  color: ${({ $bold }) => ($bold ? tokens.color.darkBlue : tokens.color.darkGray)};
  line-height: 16px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const LedgerFootnote = styled.span<{ $tone: 'success' | 'danger' }>`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${({ $tone }) => tokens.color.status[$tone].fg};
  line-height: 16px;
`

/* ─── Round inputs ─── */

const InputsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  width: 100%;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const InputChip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: ${tokens.spacing.md} 14px;
  background: ${tokens.color.surfaceAlt};
  border-radius: 10px;
`

const InputValue = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  font-variant-numeric: tabular-nums;
`

const InputLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 16px;
`

/* ─── Reconciliation ─── */

const ReconciliationLine = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.xs};
  width: 100%;
  padding-top: ${tokens.spacing.md};
`

const ReconciliationText = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textSubtle};
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  text-align: center;
`

const ReconciliationWarning = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.status.danger.fg};
  line-height: 16px;
  text-align: center;
`

/* ─── Formatting helpers ─── */

/** "35.00", "1,234.50" — same 2dp convention as the summary panel. */
function formatEnsFixed(value: string): string {
  return formatEnsAmount(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Averages: compact above 10K ("812K"), thousands-separated below ("2,140"). */
function formatAvgEns(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  if (n >= 10_000) return formatEnsCompact(value)
  return formatEnsAmount(value, { maximumFractionDigits: n >= 1_000 ? 0 : 2 })
}

function formatPoolInput(value: string | null): string {
  if (value == null) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${formatEnsAmount(value, { maximumFractionDigits: 0 })} ENS`
}

function formatVpGrowthInput(value: string | null): string {
  if (value == null) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${formatEnsAmount(value, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })}%`
}

function formatBlockNumber(blockNumber: string): string {
  const n = Number(blockNumber)
  return Number.isFinite(n) ? n.toLocaleString('en-US') : blockNumber
}

function capHint(capStatus: CapStatus): string {
  return capStatus === 'reached_cap'
    ? 'reached the cap, see ledger below'
    : 'received redistribution, see ledger below'
}

/* ─── Sub-components ─── */

interface RoleSectionProps {
  role: ProvenanceRole
  dotColor: string
  amountColor: string
  averageLabel: string
  /** Differentiates the two averaging windows — they must not read the same. */
  averageWindow: string
  averageEns: string
  shareLabel: string
  provenance: VoterProvenance | TokenHolderProvenance
  testId: string
}

function RoleSection({
  role,
  dotColor,
  amountColor,
  averageLabel,
  averageWindow,
  averageEns,
  shareLabel,
  provenance,
  testId,
}: RoleSectionProps) {
  const roleTitle = role === 'delegate' ? 'As delegate (voting)' : 'As token holder'
  const capPct = role === 'delegate' ? '1' : '5'

  return (
    <>
      <RoleHeader data-testid={testId}>
        <RoleDot $color={dotColor} aria-hidden />
        <RoleName>{roleTitle}</RoleName>
        <RoleAmount $color={amountColor}>
          {formatEnsFixed(provenance.finalRewardEns)} ENS
        </RoleAmount>
      </RoleHeader>
      <KvList>
        <KvRow>
          <KvLabelGroup>
            <KvLabel>{averageLabel}</KvLabel>
            <KvHint>{averageWindow}</KvHint>
          </KvLabelGroup>
          <KvValue>{formatAvgEns(averageEns)} ENS</KvValue>
        </KvRow>
        <KvRow>
          <KvLabelGroup>
            <KvLabel>{shareLabel}</KvLabel>
          </KvLabelGroup>
          <KvValue>{provenance.poolSharePct}%</KvValue>
        </KvRow>
        <KvRow>
          <KvLabelGroup>
            <KvLabel>Raw proportional share</KvLabel>
          </KvLabelGroup>
          <KvValue>{formatEnsFixed(provenance.rawRewardEns)} ENS</KvValue>
        </KvRow>
        {provenance.capStatus !== 'not_affected' ? (
          <KvRow>
            <KvLabelGroup>
              <KvLabel>After the {capPct}% cap</KvLabel>
              <KvHint>{capHint(provenance.capStatus)}</KvHint>
            </KvLabelGroup>
            <KvValue>{formatEnsFixed(provenance.finalRewardEns)} ENS</KvValue>
          </KvRow>
        ) : null}
      </KvList>
    </>
  )
}

function CapLedger({ ledger, testId }: { ledger: CapLedgerView; testId: string }) {
  if (ledger.variant === 'not-affected') {
    return (
      <LedgerCard data-testid={testId}>
        <LedgerTitle>Cap check · {ledger.role}</LedgerTitle>
        <LedgerStatus>
          <LedgerStatusDot aria-hidden />
          <LedgerStatusText>
            Paid your full proportional share. No cap applied this round.
          </LedgerStatusText>
        </LedgerStatus>
      </LedgerCard>
    )
  }

  return (
    <LedgerCard data-testid={testId}>
      <LedgerTitle>
        Cap redistribution · {ledger.role} · cap {ledger.capPct}% ({ledger.capEns}{' '}
        ENS)
      </LedgerTitle>
      <LedgerTable>
        <LedgerRow>
          <LedgerLabelCell>Raw proportional share</LedgerLabelCell>
          <LedgerDeltaCell aria-hidden />
          <LedgerRunningCell>{ledger.rawEns} ENS</LedgerRunningCell>
        </LedgerRow>
        {ledger.steps.map((step) => (
          <LedgerRow key={step.label}>
            <LedgerLabelCell>
              {step.label}
              {step.tag ? (
                <LedgerTag $tone={step.tag.tone}>{step.tag.text}</LedgerTag>
              ) : null}
            </LedgerLabelCell>
            <LedgerDeltaCell $tone={step.tag?.tone}>{step.deltaEns}</LedgerDeltaCell>
            <LedgerRunningCell>{step.runningEns}</LedgerRunningCell>
          </LedgerRow>
        ))}
        <LedgerRow $final>
          <LedgerLabelCell $bold>{ledger.finalLabel}</LedgerLabelCell>
          <LedgerDeltaCell aria-hidden />
          <LedgerRunningCell $bold>{ledger.finalEns} ENS</LedgerRunningCell>
        </LedgerRow>
      </LedgerTable>
      <LedgerFootnote $tone={ledger.footnote.tone}>
        {ledger.footnote.text}
      </LedgerFootnote>
    </LedgerCard>
  )
}

/* ─── Component ─── */

export interface ProvenanceLotteryOutcome {
  kind: 'won' | 'lost'
  /** "6.2" — percentage with one decimal, no % sign. */
  oddsPct: string
  entryAmountEns: string
  /** Pool prize, won outcomes only. */
  prizeEns: string | null
}

interface ProvenanceMathProps {
  round: RoundDetailResponse
  reward: AddressRoundReward
  provenance: AddressRewardProvenance
  lotteryOutcome: ProvenanceLotteryOutcome | null
}

/**
 * Expanded "Show the math" panel: where the searched wallet's ENS came from,
 * role by role, with the cap ledger, the lottery draw (when the wallet
 * entered one), the round inputs, and the reconciliation line.
 */
export function ProvenanceMath({
  round,
  reward,
  provenance,
  lotteryOutcome,
}: ProvenanceMathProps) {
  const { voter, tokenHolder } = provenance

  const voterLedger = voter ? buildCapLedger('delegate', voter) : null
  const holderLedger = tokenHolder ? buildCapLedger('token holder', tokenHolder) : null
  const reconciliation = reconcileProvenance(reward, provenance)

  const tierValue =
    round.tierLabel ?? (round.tierIndex != null ? `Tier ${round.tierIndex + 1}` : '—')
  const seed = round.lottery?.seed ?? null

  return (
    <MathCard>
      <MathTitle>
        The math behind your {formatEnsFixed(reward.totalRewardEns)} ENS
      </MathTitle>

      {voter ? (
        <>
          <RoleSection
            role="delegate"
            dotColor={tokens.color.blue}
            amountColor={tokens.color.blue}
            averageLabel="Average voting power held"
            averageWindow="over the round month"
            averageEns={voter.avgVotingPowerEns}
            shareLabel="Your share of the delegate pool"
            provenance={voter}
            testId="check-wallet-math-voter"
          />
          {tokenHolder || lotteryOutcome ? <Divider aria-hidden /> : null}
        </>
      ) : null}

      {tokenHolder ? (
        <>
          <RoleSection
            role="token holder"
            dotColor={tokens.color.green}
            amountColor={tokens.color.green}
            averageLabel="Average token balance"
            averageWindow="over the last 180 days"
            averageEns={tokenHolder.avgBalanceEns}
            shareLabel="Your share of delegated balance"
            provenance={tokenHolder}
            testId="check-wallet-math-holder"
          />
          {tokenHolder.sources && tokenHolder.sources.length > 0 ? (
            <SourceList data-testid="check-wallet-math-sources">
              <BlockTitle>Where your delegated balance came from</BlockTitle>
              {tokenHolder.sources.map((kind) => (
                <SourceItem key={kind}>
                  <SourceBullet aria-hidden />
                  <SourceText>{sourceLabel(kind)}</SourceText>
                </SourceItem>
              ))}
            </SourceList>
          ) : null}
          {lotteryOutcome ? <Divider aria-hidden /> : null}
        </>
      ) : null}

      {lotteryOutcome ? (
        <>
          <RoleHeader data-testid="check-wallet-math-lottery">
            <RoleDot $color={tokens.color.orange} aria-hidden />
            <RoleName>Lottery draw</RoleName>
            <RoleAmount
              $color={
                lotteryOutcome.kind === 'won' ? BRIGHT_GREEN : tokens.color.darkGray
              }
            >
              {lotteryOutcome.kind === 'won' && lotteryOutcome.prizeEns
                ? `${formatEnsFixed(lotteryOutcome.prizeEns)} ENS`
                : '0 ENS'}
            </RoleAmount>
          </RoleHeader>
          <KvList>
            <KvRow>
              <KvLabelGroup>
                <KvLabel>Entry that qualified</KvLabel>
                <KvHint>rewards under 1 ENS enter a pool draw</KvHint>
              </KvLabelGroup>
              <KvValue>{formatEnsFixed(lotteryOutcome.entryAmountEns)} ENS</KvValue>
            </KvRow>
            <KvRow>
              <KvLabelGroup>
                <KvLabel>Winning odds</KvLabel>
              </KvLabelGroup>
              <KvValue>{lotteryOutcome.oddsPct}%</KvValue>
            </KvRow>
            {seed ? (
              <>
                <KvRow>
                  <KvLabelGroup>
                    <KvLabel>Drawn from Ethereum block</KvLabel>
                  </KvLabelGroup>
                  <KvValue>#{formatBlockNumber(seed.blockNumber)}</KvValue>
                </KvRow>
                <KvRow>
                  <KvLabelGroup>
                    <KvLabel>Randomness seed</KvLabel>
                  </KvLabelGroup>
                  <KvValue>{seed.label}</KvValue>
                </KvRow>
              </>
            ) : null}
          </KvList>
        </>
      ) : null}

      {voterLedger || holderLedger ? (
        <>
          <Divider aria-hidden />
          {voterLedger ? (
            <CapLedger ledger={voterLedger} testId="check-wallet-cap-ledger-delegate" />
          ) : null}
          {holderLedger ? (
            <CapLedger ledger={holderLedger} testId="check-wallet-cap-ledger-holder" />
          ) : null}
        </>
      ) : null}

      <Divider aria-hidden />
      <BlockTitle>Round inputs</BlockTitle>
      <InputsGrid data-testid="check-wallet-round-inputs">
        <InputChip>
          <InputValue>{tierValue}</InputValue>
          <InputLabel>Tier reached</InputLabel>
        </InputChip>
        <InputChip>
          <InputValue>{formatPoolInput(round.poolSizeEns)}</InputValue>
          <InputLabel>Pool size</InputLabel>
        </InputChip>
        <InputChip>
          <InputValue>{formatVpGrowthInput(round.vpGrowthPct)}</InputValue>
          <InputLabel>VP growth</InputLabel>
        </InputChip>
      </InputsGrid>

      {reconciliation ? (
        <ReconciliationLine data-testid="check-wallet-math-reconciliation">
          <ReconciliationText>
            {reconciliation.termsEns.join('  +  ')}  =  {reconciliation.sumEns} ENS
          </ReconciliationText>
          {!reconciliation.matches ? (
            <ReconciliationWarning data-testid="check-wallet-math-mismatch">
              Doesn&apos;t add up to the recorded total of {reconciliation.totalEns}{' '}
              ENS.
            </ReconciliationWarning>
          ) : null}
        </ReconciliationLine>
      ) : null}
    </MathCard>
  )
}
