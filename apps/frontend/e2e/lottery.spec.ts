import { test, expect } from '@playwright/test'

test.describe('Lottery Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lottery')
  })

  test('renders lottery heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', {
        name: /Small balance\? You still have a shot/,
      }),
    ).toBeVisible()
  })

  test('renders how the draw works section', async ({ page }) => {
    await expect(page.getByText('How the draw works')).toBeVisible()
    await expect(
      page.getByText(/verifiable random draw selects a winner/),
    ).toBeVisible()
  })

  test('renders prize card', async ({ page }) => {
    await expect(page.getByText('Prize Per Pool')).toBeVisible()
    await expect(page.getByText(/ENS$/)).toBeVisible()
  })
})
