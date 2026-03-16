import { test, expect } from '@playwright/test'

test.describe('Mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('header shows hamburger menu on mobile', async ({ page }) => {
    await page.goto('/')
    const hamburger = page.getByRole('button', { name: /open menu/i })
    await expect(hamburger).toBeVisible()
  })

  test('hamburger opens mobile drawer with all nav links', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /open menu/i }).click()

    // Mobile drawer links should be visible
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Transparency', exact: true }).first()).toBeVisible()
  })

  test('clicking a nav link navigates and closes menu', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /open menu/i }).click()

    // Click the visible "Delegates" link in the drawer
    await page.getByRole('link', { name: 'Delegates', exact: true }).first().click()

    await expect(page).toHaveURL(/\/delegates/)
    await expect(page.getByRole('button', { name: /open menu/i })).toBeVisible()
  })

  test('closing menu by clicking close button', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /open menu/i }).click()

    // Home link should be visible (only exists in mobile drawer)
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible()

    await page.getByRole('button', { name: /close menu/i }).click()
    // After closing, the Home link should be gone
    await expect(page.getByRole('link', { name: 'Home', exact: true })).not.toBeVisible()
  })
})
