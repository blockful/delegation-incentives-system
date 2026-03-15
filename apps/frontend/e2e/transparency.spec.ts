import { test, expect } from '@playwright/test'

test.describe('Transparency Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transparency')
  })

  test('renders page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Verify everything on-chain/ }),
    ).toBeVisible()
  })

  test('renders smart contract entries', async ({ page }) => {
    await expect(page.getByText('Smart Contracts')).toBeVisible()
    await expect(page.getByText('ENS Incentives')).toBeVisible()
    await expect(page.getByText('Delegate By Sig')).toBeVisible()
    await expect(page.getByText('Reward Distributor')).toBeVisible()
  })

  test('renders verify links', async ({ page }) => {
    await expect(page.getByText('Verify Yourself')).toBeVisible()
    await expect(page.getByText('GitHub')).toBeVisible()
    await expect(page.getByText('Anticapture')).toBeVisible()
    await expect(page.getByText('Dune Analytics')).toBeVisible()
  })

  test('renders how rewards are calculated section', async ({ page }) => {
    await expect(
      page.getByText('How rewards are calculated'),
    ).toBeVisible()
    await expect(
      page.getByText(/voting power delegated to active delegates/),
    ).toBeVisible()
  })
})
