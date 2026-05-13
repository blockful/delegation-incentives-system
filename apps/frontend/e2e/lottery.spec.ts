import { test, expect } from '@playwright/test'

test.describe('Lottery Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lottery')
  })

  test('renders lottery heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Lottery buckets/ }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('renders address inspector', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Inspect address/ })).toBeVisible({ timeout: 10000 })
    await expect(page.getByLabel('Wallet address')).toBeVisible()
  })

  test('shows bucket explorer when data is available', async ({ page }) => {
    await expect(page.getByText('Choose lottery')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Bucket #|Final buckets are not available/).first()).toBeVisible()
  })
})
