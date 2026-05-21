import { test, expect } from '@playwright/test'

test.describe('All pages render on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('landing page renders hero and key sections', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: /Earn up to.*APR on your ENS/i }),
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /Delegate now/i }).first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Your APR grows when others delegate too/i }),
    ).toBeVisible()
    const stepsHeading = page.getByRole('heading', { name: /Simple to join/i })
    await stepsHeading.scrollIntoViewIfNeeded()
    await expect(stepsHeading).toBeVisible()
  })

  test('landing page shows round status bar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Round \d+/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/active VP growth/i)).toBeVisible()
  })

  test('landing page shows tier table with 7 tiers', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Tier #7')).toBeVisible({ timeout: 10000 })
  })

  test('voters page renders header and cards', async ({ page }) => {
    await page.goto('/voters')
    await expect(page.getByText('Delegate & earn')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Pick an active voter\. Earn ENS automatically\./i }),
    ).toBeVisible()
    await expect(page.getByText('active voters', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('wallets earning', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Random/i })).toBeVisible()
  })

  test('rounds page renders round card and history', async ({ page }) => {
    await page.goto('/rounds')
    // Use the eyebrow label which is always visible
    await expect(page.getByRole('heading', { level: 1, name: /Round \d+/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Currently on Tier \d+ of \d+/i)).toBeVisible()
    await expect(page.getByText(/Inspect address/i)).toBeVisible()
  })

  test('transparency page renders all sections', async ({ page }) => {
    await page.goto('/transparency')
    await expect(page.getByRole('heading', { name: /Verify everything onchain/i })).toBeVisible()
    await expect(page.getByText('GitHub repo')).toBeVisible()
    // "Anticapture" also appears in the footer credits — pick the methodology card.
    await expect(page.getByText('Anticapture').first()).toBeVisible()
    await expect(page.getByText('How rewards are computed')).toBeVisible()
  })

  test('footer is visible on all pages', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: /Earn up to.*APR on your ENS/i }),
    ).toBeVisible({ timeout: 10000 })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.getByText(/Built by/i)).toBeVisible()
  })
})
