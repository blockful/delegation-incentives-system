import { test, expect } from '@playwright/test'

test.describe('Rounds Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rounds')
  })

  test('renders round heading with live tag', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Round \d+ is/ }),
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('live').first()).toBeVisible()
  })

  test('renders tier table', async ({ page }) => {
    await expect(page.getByText('Tier #1').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Tier #7')).toBeVisible()
  })

  test('renders round history', async ({ page }) => {
    await expect(page.getByText(/Round 3/).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Paid/i).first()).toBeVisible()
  })
})
