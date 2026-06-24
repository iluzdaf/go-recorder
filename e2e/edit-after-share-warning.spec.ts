import { test, expect, type Page } from '@playwright/test'

async function createDraftWithShare(page: Page) {
  await page.goto('/')
  await page.click('button:has-text("Create Draft")')
  await expect(page).toHaveURL(/\/drafts\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()

  // Place a stone so the draft is shareable
  await page.locator('.shudan-goban').click()

  // Open share menu — the share auto-creates
  await page.click('button[aria-label="Share"]')
  await expect(
    page.locator('#share-menu').getByRole('button', { name: 'Copy link' })
  ).toBeVisible({ timeout: 15000 })

  // Close the share menu by clicking outside
  await page.keyboard.press('Escape')
  await expect(page.locator('#share-menu')).not.toBeVisible()
}

test('warning appears on first edit after share, cancel keeps board unchanged', async ({ page }) => {
  await createDraftWithShare(page)

  const goban = page.locator('.shudan-goban')
  const warning = page.getByRole('dialog', { name: /share was created/i })

  // Count stones before attempting the edit
  const stonesBefore = await goban.locator('.shudan-stone').count()

  // Tap a different cell — warning should appear
  const box = await goban.boundingBox()
  if (!box) throw new Error('goban not found')
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
  await expect(warning).toBeVisible()

  // Cancel — board must be unchanged
  await warning.getByRole('button', { name: 'Cancel' }).click()
  await expect(warning).not.toBeVisible()
  expect(await goban.locator('.shudan-stone').count()).toBe(stonesBefore)
})

test('warning reappears after cancel, then disappears after continue', async ({ page }) => {
  await createDraftWithShare(page)

  const goban = page.locator('.shudan-goban')
  const warning = page.getByRole('dialog', { name: /share was created/i })
  const box = await goban.boundingBox()
  if (!box) throw new Error('goban not found')

  const tapX = box.x + box.width * 0.7
  const tapY = box.y + box.height * 0.3

  // First attempt — cancel
  await page.mouse.click(tapX, tapY)
  await expect(warning).toBeVisible()
  await warning.getByRole('button', { name: 'Cancel' }).click()
  await expect(warning).not.toBeVisible()

  // Second attempt — warning should appear again
  await page.mouse.click(tapX, tapY)
  await expect(warning).toBeVisible()

  // Confirm — stone should be placed
  const stonesBefore = await goban.locator('.shudan-stone').count()
  await warning.getByRole('button', { name: 'Continue' }).click()
  await expect(warning).not.toBeVisible()
  expect(await goban.locator('.shudan-stone').count()).toBeGreaterThan(stonesBefore)
})

test('no warning on subsequent edits after confirming once', async ({ page }) => {
  await createDraftWithShare(page)

  const goban = page.locator('.shudan-goban')
  const warning = page.getByRole('dialog', { name: /share was created/i })
  const box = await goban.boundingBox()
  if (!box) throw new Error('goban not found')

  // Confirm the first post-share edit
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
  await expect(warning).toBeVisible()
  await warning.getByRole('button', { name: 'Continue' }).click()
  await expect(warning).not.toBeVisible()

  // Another edit — warning must NOT appear
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.7)
  await expect(warning).not.toBeVisible({ timeout: 1000 })
})
