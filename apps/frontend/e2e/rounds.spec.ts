import { test, expect } from '@playwright/test'

test.describe('Rounds Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rounds')
  })

  test('renders round heading with live tag', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Round \d+ is/ }),
    ).toBeVisible()
    await expect(page.getByText('live')).toBeVisible()
  })

  test('renders tier table', async ({ page }) => {
    await expect(page.getByText('Tier #1')).toBeVisible()
    await expect(page.getByText('Tier #6')).toBeVisible()
  })

  test('renders round history', async ({ page }) => {
    await expect(page.getByText(/Round 3/)).toBeVisible()
    await expect(page.getByText('paid').first()).toBeVisible()
  })
})
