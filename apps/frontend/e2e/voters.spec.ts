import { test, expect } from '@playwright/test'

test.describe('Voters Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/voters')
  })

  test('renders page heading', async ({ page }) => {
    // The redesigned voters page heading reads
    // "Pick an active voter. Earn ENS automatically." (h1).
    await expect(
      page.getByRole('heading', { level: 1, name: /Pick an active voter\. Earn ENS automatically\./i }),
    ).toBeVisible()
  })

  test('renders sort controls', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Voting Power/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Activity/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Random/i })).toBeVisible()
  })

  test('renders voter cards after loading', async ({ page }) => {
    // Wait for voter cards to appear — they contain ENS names or addresses
    await expect(page.getByText(/\.eth|0x/).first()).toBeVisible({ timeout: 15000 })
  })

  test('renders stats bar', async ({ page }) => {
    await expect(page.getByText('active voters', { exact: true })).toBeVisible()
    await expect(page.getByText('wallets earning', { exact: true })).toBeVisible()
  })
})
