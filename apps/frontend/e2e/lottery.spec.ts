import { test, expect } from '@playwright/test'

test.describe('Lottery Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lottery')
  })

  test('renders lottery heading', async ({ page }) => {
    await expect(
      page.getByText(/Small balance\? You still have a shot/),
    ).toBeVisible({ timeout: 10000 })
  })

  test('renders how the draw works section', async ({ page }) => {
    await expect(page.getByText('How the draw works')).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByText(/verifiable random draw selects a winner/),
    ).toBeVisible()
  })

  test('shows empty state or prize card', async ({ page }) => {
    // Either the empty state or the prize card should be visible
    const emptyState = page.getByText(/No rounds have been completed yet/)
    const prizeCard = page.getByText('Prize Per Pool')
    await expect(emptyState.or(prizeCard)).toBeVisible({ timeout: 10000 })
  })
})
