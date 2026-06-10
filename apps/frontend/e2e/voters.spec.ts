import { test, expect } from '@playwright/test'

test.describe('Voters Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/voters')
  })

  test('renders page heading', async ({ page }) => {
    // The redesigned voters page heading reads
    // "Pick an active voter. Earn ENS automatically." (h1).
    await expect(
      page.getByRole('heading', { level: 1, name: /Pick an active voter\. Earn ENS automatically\./i }),
    ).toBeVisible()
  })

  test('renders sort controls', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Voting Power/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Activity/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Random/i })).toBeVisible()
  })

  test('renders voter cards after loading', async ({ page }) => {
    // Wait for voter cards to appear — they contain ENS names or addresses
    await expect(page.getByText(/\.eth|0x/).first()).toBeVisible({ timeout: 15000 })
  })

  test('renders stats bar', async ({ page }) => {
    await expect(page.getByText('active voters', { exact: true })).toBeVisible()
    await expect(page.getByText('wallets earning', { exact: true })).toBeVisible()
  })
})

test.describe('Voters Page — random sort & profile link', () => {
  test('voter order changes between visits', async ({ page }) => {
    const getOrder = async () => {
      await page.goto('/voters')
      const first = page.locator('a[aria-label^="View profile for"]').first()
      await first.waitFor({ timeout: 15000 })
      return page
        .locator('a[aria-label^="View profile for"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
    }

    const order1 = await getOrder()
    const order2 = await getOrder()

    expect(order1.length).toBeGreaterThan(1)
    // Same voters, different order. With a random seed per visit, two
    // identical shuffles of 10+ cards are practically impossible.
    expect([...order2].sort()).toEqual([...order1].sort())
    expect(order2).not.toEqual(order1)
  })

  test('View profile link navigates to the voter profile', async ({ page }) => {
    await page.goto('/voters')
    // exact: true so the invisible whole-card overlay ("View profile for X")
    // is not matched — this targets the visible link added in DEV-765.
    const link = page.getByRole('link', { name: 'View profile', exact: true }).first()
    await link.waitFor({ timeout: 15000 })
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^\/voters\/.+/)
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
  })
})
