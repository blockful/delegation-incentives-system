import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('renders hero heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Your ENS could be earning/)).toBeVisible({ timeout: 10000 })
  })

  test('renders tier table', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Tier #1').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Tier #7')).toBeVisible()
  })

  test('renders how it works section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Simple to join/)).toBeVisible({ timeout: 10000 })
  })

  test('renders footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Built by Blockful/)).toBeVisible({ timeout: 10000 })
  })

  test('navigate to voters from CTA', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Delegate Now/i }).first().click()
    await expect(page).toHaveURL('/voters')
  })

  test('navigate through all pages', async ({ page }) => {
    for (const path of [
      '/',
      '/voters',
      '/rounds',
      '/lottery',
      '/transparency',
    ]) {
      await page.goto(path)
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
    }
  })
})
