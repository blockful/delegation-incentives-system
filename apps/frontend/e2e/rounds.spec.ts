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

  test('renders round history without contradicting the current live round', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /Round \d+ is/ })
    await expect(heading).toBeVisible({ timeout: 10000 })

    const roundName = (await heading.textContent())?.match(/Round \d+/)?.[0]
    expect(roundName).toBeTruthy()

    const currentRoundRow = page.getByRole('row').filter({ has: page.getByRole('link', { name: roundName! }) }).first()
    await expect(currentRoundRow).toContainText(/Live/i)
    await expect(currentRoundRow).not.toContainText(/Paid/i)
    await expect(currentRoundRow).toContainText('May 1–31, 2026')
    await expect(currentRoundRow).not.toContainText('Apr 30')
    await expect(currentRoundRow).toContainText('5,000 ENS')
    await expect(currentRoundRow).toContainText(/Pending|Unavailable/i)

    await expect(page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Round 2' }) }).first()).toContainText('Apr 1–30, 2026')
    await expect(page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Round 1' }) }).first()).toContainText('Mar 1–31, 2026')
    await expect(page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Round 1' }) }).first()).toContainText(/Ended|Paid/i)
    await expect(page.getByText('+12.3456 ENS')).toHaveCount(0)
  })

  test('lets a user inspect an address and open round details', async ({ page }) => {
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

    await page.getByLabel('Wallet address').fill(address)
    await page.getByRole('button', { name: 'Inspect' }).click()
    await expect(page).toHaveURL(/address=/)
    await expect(page.getByText(address).first()).toBeVisible()

    await page.locator('section').filter({ hasText: 'Round History' }).getByRole('link', { name: 'Round 3' }).click()
    await expect(page).toHaveURL(/\/rounds\/3/)
    await expect(page.getByText('Round Details')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Round 3', exact: true })).toBeVisible()
    await expect(page.getByText('Top Delegate Rewards')).toBeVisible()
    await expect(page.getByText('Top Token Holder Rewards')).toBeVisible()
    await expect(page.getByText(/No distribution data|#1/).first()).toBeVisible()
  })

  test('does not create horizontal page overflow on mobile or tablet widths', async ({ page }) => {
    for (const viewport of [
      { width: 320, height: 844 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/rounds')
      await expect(
        page.getByRole('heading', { name: /Round \d+ is/ }),
      ).toBeVisible({ timeout: 10000 })

      const overflow = await page.evaluate(() => {
        const root = document.documentElement
        return root.scrollWidth - root.clientWidth
      })

      expect(overflow).toBeLessThanOrEqual(0)

      await page.locator('section').filter({ hasText: 'Round History' }).getByRole('link', { name: 'Round 3' }).click()
      await expect(page.getByText('Round Details')).toBeVisible()

      const detailOverflow = await page.evaluate(() => {
        const root = document.documentElement
        return root.scrollWidth - root.clientWidth
      })

      expect(detailOverflow).toBeLessThanOrEqual(0)
    }
  })
})
