import { test, expect, type Page } from '@playwright/test'
import { openSharePanelAndCreateLink, openShareTab, startGame } from './helpers'

async function createGameWithShare(page: Page) {
  await startGame(page)

  // Place a move so the game is shareable
  const box = await page.locator('.shudan-goban').boundingBox()
  if (!box) throw new Error('goban not found')
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25)

  await openSharePanelAndCreateLink(page)

  // Close the share menu
  await page.keyboard.press('Escape')
  await expect(page.locator('#share-menu')).not.toBeVisible()
}

async function createDraftWithShare(page: Page) {
  await page.goto('/')
  await page.click('button:has-text("Create Draft")')
  await expect(page).toHaveURL(/\/drafts\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()

  // Place a stone so the draft is shareable
  await page.locator('.shudan-goban').click()

  await openSharePanelAndCreateLink(page)

  // Close the share menu by clicking outside
  await page.keyboard.press('Escape')
  await expect(page.locator('#share-menu')).not.toBeVisible()
}

test('warning appears on first edit after share, cancel keeps board unchanged', async ({ page }) => {
  await createDraftWithShare(page)

  const goban = page.locator('.shudan-goban')
  const warning = page.getByRole('dialog', { name: /share was created/i })

  // Count stones before attempting the edit
  const stonesBefore = await goban.locator('.shudan-vertex.shudan-sign_1, .shudan-vertex.shudan-sign_-1').count()

  // Tap a different cell — warning should appear
  const box = await goban.boundingBox()
  if (!box) throw new Error('goban not found')
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
  await expect(warning).toBeVisible()

  // Cancel — board must be unchanged
  await warning.getByRole('button', { name: 'Cancel' }).click()
  await expect(warning).not.toBeVisible()
  expect(await goban.locator('.shudan-vertex.shudan-sign_1, .shudan-vertex.shudan-sign_-1').count()).toBe(stonesBefore)
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
  const stonesBefore = await goban.locator('.shudan-vertex.shudan-sign_1, .shudan-vertex.shudan-sign_-1').count()
  await warning.getByRole('button', { name: 'Continue' }).click()
  await expect(warning).not.toBeVisible()
  expect(await goban.locator('.shudan-vertex.shudan-sign_1, .shudan-vertex.shudan-sign_-1').count()).toBeGreaterThan(stonesBefore)
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

test('no warning on a fresh draft with no share', async ({ page }) => {
  await page.goto('/')
  await page.click('button:has-text("Create Draft")')
  await expect(page).toHaveURL(/\/drafts\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()

  const warning = page.getByRole('dialog', { name: /share was created/i })

  // Place a stone — no share exists, so no warning
  await page.locator('.shudan-goban').click()
  await expect(warning).not.toBeVisible({ timeout: 1000 })
})

test('game recording: warning → cancel → warning again → continue → no further warning', async ({ page }) => {
  await createGameWithShare(page)

  const goban = page.locator('.shudan-goban')
  const warning = page.getByRole('dialog', { name: /share was created/i })
  const box = await goban.boundingBox()
  if (!box) throw new Error('goban not found')

  const tapX = box.x + box.width * 0.6
  const tapY = box.y + box.height * 0.6

  // First tap — warning appears
  const stonesBefore = await goban.locator('.shudan-vertex.shudan-sign_1, .shudan-vertex.shudan-sign_-1').count()
  await page.mouse.click(tapX, tapY)
  await expect(warning).toBeVisible()

  // Cancel — move not placed, warning gone
  await warning.getByRole('button', { name: 'Cancel' }).click()
  await expect(warning).not.toBeVisible()
  expect(await goban.locator('.shudan-vertex.shudan-sign_1, .shudan-vertex.shudan-sign_-1').count()).toBe(stonesBefore)

  // Second tap — warning reappears
  await page.mouse.click(tapX, tapY)
  await expect(warning).toBeVisible()

  // Confirm — move is placed
  await warning.getByRole('button', { name: 'Continue' }).click()
  await expect(warning).not.toBeVisible()
  expect(await goban.locator('.shudan-vertex.shudan-sign_1, .shudan-vertex.shudan-sign_-1').count()).toBeGreaterThan(stonesBefore)

  // Third tap — no warning
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await expect(warning).not.toBeVisible({ timeout: 1000 })
})

test('editing player name after share shows confirm dialog', async ({ page }) => {
  await createDraftWithShare(page)

  // Open Details panel and edit the black player name
  await page.click('button[aria-label="Details"]')
  await expect(page.locator('#share-menu')).toBeVisible()
  await page.locator('#share-menu input[placeholder="Black"]').fill('New Name')
  await page.locator('#share-menu input[placeholder="Black"]').blur()

  // Confirm dialog should appear
  const dialog = page.getByRole('dialog', { name: /share was created/i })
  await expect(dialog).toBeVisible()

  // Confirming resets the share — Share tab should show Create link, not Copy link
  await dialog.getByRole('button', { name: /continue/i }).click()
  await expect(dialog).not.toBeVisible()
  await openShareTab(page)
  await expect(
    page.locator('#share-menu').getByRole('button', { name: 'Copy link' })
  ).not.toBeVisible()
  await expect(
    page.locator('#share-menu').getByRole('button', { name: 'Create link' })
  ).toBeVisible()
})

test('editing komi after share shows confirm dialog', async ({ page }) => {
  await createDraftWithShare(page)

  // Open Details panel and change komi via the Rules section
  await page.click('button[aria-label="Details"]')
  await expect(page.locator('#share-menu')).toBeVisible()
  await page.locator('#share-menu').getByRole('button', { name: 'Rules' }).click()
  await page.locator('#share-menu select').selectOption('7.5')

  // Confirm dialog should appear
  const dialog = page.getByRole('dialog', { name: /share was created/i })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /cancel/i }).click()
  await expect(dialog).not.toBeVisible()
})
