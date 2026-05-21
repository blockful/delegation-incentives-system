import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('renders hero heading', async ({ page }) => {
    await page.goto('/')
    // The redesigned hero headline is split across nodes:
    //   "Earn up to <AprValue>{n}% APR</AprValue> on your ENS automatically".
    // Match on the level-1 heading using a regex that tolerates the inner
    // APR span (which is dynamic) and any whitespace between segments.
    await expect(
      page.getByRole('heading', { level: 1, name: /Earn up to.*APR on your ENS/i }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('renders tier table', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Tier #1').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Tier #7')).toBeVisible()
  })

  test('renders how it works section', async ({ page }) => {
    await page.goto('/')
    // The "How it works" section heading now reads "Simple to join."
    // (the redesigned copy includes a trailing period and a line break).
    await expect(page.getByText(/Simple to join/)).toBeVisible({ timeout: 10000 })
  })

  test('renders footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Built by Blockful/).first()).toBeVisible({ timeout: 10000 })
  })

  test('navigate to voters from CTA', async ({ page }) => {
    await page.goto('/')
    // The hero CTA reads "Delegate now" (lower-case "now") plus an inline
    // "Free" badge — match case-insensitively via the link's accessible name.
    await page.getByRole('link', { name: /Delegate now/i }).first().click()
    await expect(page).toHaveURL('/voters')
  })

  test('navigate through all pages', async ({ page }) => {
    for (const path of [
      '/',
      '/voters',
      '/rounds',
      '/transparency',
    ]) {
      await page.goto(path)
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
    }
  })
})
