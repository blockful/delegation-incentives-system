import { test, expect } from '@playwright/test'

// Mock voter from src/api/mock.ts — nick.eth has 8/10 votes in the seeded fixture,
// so the Voting record table should populate "Delegate Vote" + "Result" columns
// with real labels (not the legacy "—" placeholder).
const VOTER_ADDRESS = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'

test.describe('Voter profile page — voting record', () => {
  test('renders Result column values from API data', async ({ page }) => {
    await page.goto(`/voters/${VOTER_ADDRESS}`)

    await expect(page.getByRole('heading', { name: /Voting record/i })).toBeVisible({ timeout: 15000 })

    // The Result column should show outcome labels for at least one row.
    const passedCells = page.getByText('Passed', { exact: true })
    await expect(passedCells.first()).toBeVisible()

    // And the Delegate Vote column should show real vote choices (not just "Did not vote").
    const forVotes = page.getByText('For', { exact: true })
    await expect(forVotes.first()).toBeVisible()
  })
})
