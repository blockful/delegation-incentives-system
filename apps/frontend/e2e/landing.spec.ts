import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('renders hero heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Your ENS is sitting idle/)).toBeVisible()
  })

  test('renders tier table', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Tier #1')).toBeVisible()
    await expect(page.getByText('Tier #6')).toBeVisible()
  })

  test('renders how it works section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Simple to join/)).toBeVisible()
  })

  test('renders footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Built by Blockful/)).toBeVisible()
  })

  test('navigate to delegates from CTA', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Delegate Now/i }).click()
    await expect(page).toHaveURL('/delegates')
  })

  test('navigate through all pages', async ({ page }) => {
    for (const path of [
      '/',
      '/delegates',
      '/rounds',
      '/lottery',
      '/transparency',
    ]) {
      await page.goto(path)
      await expect(page.locator('h1').first()).toBeVisible()
    }
  })
})
