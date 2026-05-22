import { test, expect } from '@playwright/test'

test.describe('Rounds Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rounds')
  })

  test('renders round heading with live tag', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: /Round \d+/ }),
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('live').first()).toBeVisible()
  })

  test('renders tier ladder with all 7 tiers', async ({ page }) => {
    // The /rounds tier ladder renders pips labelled "Tier 1" … "Tier 7"
    // (no "#" — the "#"-style label only lives on the landing page).
    await expect(page.getByText('Tier 1', { exact: true }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Tier 7', { exact: true })).toBeVisible()
  })

  test('renders round history rows for past rounds', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1, name: /Round \d+/ })
    await expect(heading).toBeVisible({ timeout: 10000 })

    const roundName = (await heading.textContent())?.match(/Round \d+/)?.[0]
    expect(roundName).toBeTruthy()

    // The redesigned rounds table renders each round as a clickable button row
    // (not a link). Each row's accessible name includes the round number,
    // pool size, VP growth, reward state, and status pill. The period column
    // was removed in the redesign — it now only appears on the transparency
    // page and inside the round detail progress ring.
    const currentRoundRow = page
      .getByRole('button', { name: new RegExp(roundName!) })
      .first()
    await expect(currentRoundRow).toBeVisible()
    // Pool renders in compact form (e.g. "5K ENS") via formatPool.
    await expect(currentRoundRow).toContainText(/\d+(?:\.\d+)?K? ENS|Unavailable/)
    // Status pill — guaranteed to read one of these regardless of address.
    await expect(currentRoundRow).toContainText(/live|paid|pending/i)

    // Sibling rows for prior rounds should also be present.
    await expect(page.getByRole('button', { name: /Round 2/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Round 1/ }).first()).toBeVisible()
    // Paranoia check — no 4-decimal ENS reward leak from the source data.
    await expect(page.getByText('+12.3456 ENS')).toHaveCount(0)
  })

  test('lets a user inspect an address and open round details', async ({ page }) => {
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

    // The redesigned inspect form uses a single search input ("Search by ENS
    // name or address") and a "Search" submit button.
    await page.getByLabel('Search by ENS name or address').fill(address)
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page).toHaveURL(/address=/)
    await expect(page.getByLabel('Search by ENS name or address')).toHaveValue(address)

    // Round rows are buttons (navigate via onClick) — pick the Round 3 row.
    await page.getByRole('button', { name: /Round 3/ }).first().click()
    await expect(page).toHaveURL(/\/rounds\/3/)
    await expect(page.getByRole('heading', { name: 'Round 3', exact: true })).toBeVisible()
    // Prev/next nav buttons label themselves with the neighbour round number
    // when one exists, falling back to a generic "Next"/"Previous" otherwise.
    await expect(page.getByRole('button', { name: /Round 2/ })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /(Round \d+|Next)/ }).last(),
    ).toBeVisible()
    // The two leaderboards on the detail page.
    await expect(page.getByRole('heading', { name: 'Top delegates this round' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Top holders this round' })).toBeVisible()
  })

  test('resolves an ENS name in the inspect search', async ({ page }) => {
    // nick.eth is seeded in MOCK_ENS_TO_ADDRESS; e2e runs with VITE_USE_MOCK_API=true
    await page.getByLabel('Search by ENS name or address').fill('nick.eth')
    await page.getByRole('button', { name: /Search/i }).click()

    await expect(page).toHaveURL(/[?&]address=0x[a-fA-F0-9]{40}/, { timeout: 15000 })
  })

  test('flags an ENS name that does not resolve', async ({ page }) => {
    await page
      .getByLabel('Search by ENS name or address')
      .fill('definitely-not-a-real-name-please.eth')
    await page.getByRole('button', { name: /Search/i }).click()

    await expect(
      page.getByText(/Couldn't resolve definitely-not-a-real-name-please\.eth/),
    ).toBeVisible({ timeout: 15000 })
    await expect(page).not.toHaveURL(/address=/)
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
        page.getByRole('heading', { level: 1, name: /Round \d+/ }),
      ).toBeVisible({ timeout: 10000 })

      const overflow = await page.evaluate(() => {
        const root = document.documentElement
        return root.scrollWidth - root.clientWidth
      })

      expect(overflow).toBeLessThanOrEqual(0)

      await page.getByRole('button', { name: /Round 3/ }).first().click()
      await expect(page.getByRole('heading', { name: 'Round 3', exact: true })).toBeVisible()

      const detailOverflow = await page.evaluate(() => {
        const root = document.documentElement
        return root.scrollWidth - root.clientWidth
      })

      expect(detailOverflow).toBeLessThanOrEqual(0)
    }
  })
})
