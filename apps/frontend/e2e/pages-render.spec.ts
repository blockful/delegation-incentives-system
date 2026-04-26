import { test, expect } from '@playwright/test'

test.describe('All pages render on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('landing page renders hero and key sections', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('% APY')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /Delegate Now/i }).first()).toBeVisible()
    await expect(page.getByText(/The more people join/i)).toBeVisible()
    const stepsHeading = page.getByRole('heading', { name: /Simple to join/i })
    await stepsHeading.scrollIntoViewIfNeeded()
    await expect(stepsHeading).toBeVisible()
  })

  test('landing page shows round status bar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Round \d+/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('VP growth')).toBeVisible()
  })

  test('landing page shows tier table with 7 tiers', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Tier #7')).toBeVisible({ timeout: 10000 })
  })

  test('delegates page renders header and cards', async ({ page }) => {
    await page.goto('/delegates')
    await expect(page.getByText('Delegate Your Tokens')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Delegate to someone who shows up/i })).toBeVisible()
    await expect(page.getByText(/Active Delegates/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /Random/i })).toBeVisible()
  })

  test('rounds page renders round card and history', async ({ page }) => {
    await page.goto('/rounds')
    // Use the eyebrow label which is always visible
    await expect(page.getByRole('heading', { name: /Round \d+ is/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Round History')).toBeVisible()
    await expect(page.getByText('APY Tiers')).toBeVisible()
  })

  test('lottery page renders hero and how-it-works', async ({ page }) => {
    await page.goto('/lottery')
    await expect(page.getByText(/Small balance\?/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('How the draw works')).toBeVisible()
  })

  test('transparency page renders all sections', async ({ page }) => {
    await page.goto('/transparency')
    await expect(page.getByRole('heading', { name: /Verify everything on-chain/i })).toBeVisible()
    await expect(page.getByText('Verify Yourself')).toBeVisible()
    await expect(page.getByText('Smart Contracts')).toBeVisible()
    await expect(page.getByText('How rewards are calculated')).toBeVisible()
  })

  test('footer is visible on all pages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('% APY')).toBeVisible({ timeout: 10000 })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.getByText(/Built by Blockful/i)).toBeVisible()
  })
})
