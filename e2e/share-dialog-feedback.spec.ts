import { test, expect, type Page } from '@playwright/test'

async function createShareableDraft(page: Page) {
  await page.goto('/')
  await page.click('button:has-text("Create Draft")')
  await expect(page).toHaveURL(/\/drafts\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()

  // Place a stone so the draft meets the shareable threshold
  await page.locator('.shudan-goban').click()
  await expect(page.locator('button[aria-label="Details"]')).toBeEnabled()
}

async function openShareAndCreateLink(page: Page) {
  await page.click('button[aria-label="Details"]')

  const copyLink = page.locator('#share-menu').getByRole('button', { name: 'Copy link' })
  const createLink = page.locator('#share-menu').getByRole('button', { name: 'Create link' })

  // Draft boards may auto-create the share on open; handle both paths
  await expect(copyLink.or(createLink)).toBeVisible({ timeout: 5000 })
  if (await createLink.isVisible()) {
    await createLink.click()
  }

  await expect(copyLink).toBeVisible({ timeout: 15000 })
}

test('link copied feedback appears inside the share dialog', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-write'])
  await createShareableDraft(page)
  await openShareAndCreateLink(page)

  await page.click('button[aria-label="Copy link"]')

  await expect(page.locator('#share-menu').getByText('Link copied')).toBeVisible()
  await expect(page.locator('[role="status"]')).not.toBeAttached()
})

test('failed to copy feedback appears inside the share dialog', async ({ page }) => {
  await createShareableDraft(page)
  await openShareAndCreateLink(page)

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('Denied')) },
      configurable: true,
    })
  })

  await page.click('button[aria-label="Copy link"]')

  await expect(page.locator('#share-menu').getByText('Failed to copy link')).toBeVisible()
  await expect(page.locator('[role="status"]')).not.toBeAttached()
})
