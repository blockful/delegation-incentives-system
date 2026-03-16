import { test, expect } from '@playwright/test'

test.describe('Delegates Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/delegates')
  })

  test('renders page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Delegate to someone who shows up/ }),
    ).toBeVisible()
  })

  test('renders sort controls', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Voting Power/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Activity/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Random/i })).toBeVisible()
  })

  test('renders delegate cards after loading', async ({ page }) => {
    // Wait for delegate cards to appear — they contain ENS names or addresses
    await expect(page.getByText(/\.eth|0x/).first()).toBeVisible({ timeout: 15000 })
  })

  test('renders stats bar', async ({ page }) => {
    await expect(page.getByText(/Active Delegates/i)).toBeVisible()
  })
})
