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
    await expect(page.getByText('Voting Power')).toBeVisible()
    await expect(page.getByText('Activity')).toBeVisible()
    await expect(page.getByText('Random')).toBeVisible()
  })

  test('renders delegate cards after loading', async ({ page }) => {
    // Wait for loading to finish — cards contain ENS names or addresses
    await expect(page.locator('[class*="Grid"] > div').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('renders stats bar', async ({ page }) => {
    await expect(page.getByText(/Active Delegates/i)).toBeVisible()
  })
})
