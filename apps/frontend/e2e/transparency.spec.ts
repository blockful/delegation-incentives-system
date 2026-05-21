import { test, expect } from '@playwright/test'

test.describe('Transparency Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transparency')
  })

  test('renders page heading', async ({ page }) => {
    // The redesigned heading is "Verify everything onchain" (one word,
    // no hyphen) and is rendered as the page's h1.
    await expect(
      page.getByRole('heading', { level: 1, name: /Verify everything onchain/i }),
    ).toBeVisible()
  })

  // The redesigned transparency page no longer surfaces a "Smart Contracts"
  // section or per-contract entries (ENS Incentives / Delegate By Sig /
  // Reward Distributor). That information is now linked from the GitHub
  // repo card instead, so the "renders smart contract entries" test was
  // removed rather than rewritten.

  test('renders verify links', async ({ page }) => {
    // The redesigned verify block surfaces three cards: GitHub repo,
    // Anticapture, and the RFC & specs link. Dune Analytics is no longer
    // listed on this page.
    await expect(page.getByText('GitHub repo')).toBeVisible()
    // "Anticapture" also appears in the footer credits — pick the
    // methodology card's title explicitly via `.first()`.
    await expect(page.getByText('Anticapture').first()).toBeVisible()
    await expect(page.getByText(/RFC.*specs/i)).toBeVisible()
  })

  test('renders how rewards are computed section', async ({ page }) => {
    // The methodology card's section title is now
    // "How rewards are computed" (was "How rewards are calculated").
    await expect(
      page.getByRole('heading', { name: /How rewards are computed/i }),
    ).toBeVisible()
    // The 180-day window is now surfaced as a "180-day balance window"
    // guardrail chip rather than a sentence about a moving average.
    await expect(page.getByText(/180.day/i).first()).toBeVisible()
  })
})
