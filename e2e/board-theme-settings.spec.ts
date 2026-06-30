import { test, expect, type Page } from '@playwright/test'
import { openSharePanelAndCreateLink, startGameWithMetadata } from './helpers'

async function openSettings(page: Page) {
  const showHeaderButton = page.getByRole('button', { name: 'Show header' })
  if (await showHeaderButton.isVisible().catch(() => false)) {
    await showHeaderButton.click()
  }

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
}

async function boardThemeClass(page: Page) {
  return page.locator('.shudan-goban').evaluate((goban) => {
    const themed = goban.closest('[class*="goban-theme-"]')
    return themed?.className ?? ''
  })
}

async function placeMoveOnBoard(page: Page) {
  const box = await page.locator('.shudan-goban').boundingBox()
  if (!box) throw new Error('goban not found')
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25)
}

test('board theme settings persist across recorder, draft, and share boards', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('go-recorder:theme', 'light')
    localStorage.removeItem('go-recorder:light-board-theme')
    localStorage.removeItem('go-recorder:dark-board-theme')
  })

  await startGameWithMetadata(page, 'Black', 'White')
  await openSettings(page)
  await page.getByLabel('Light board theme').selectOption('wood')
  await expect.poll(() => boardThemeClass(page)).toContain('goban-theme-wood-light')

  const gameUrl = page.url()
  await page.reload()
  await expect(page).toHaveURL(gameUrl)
  await expect(page.locator('.shudan-goban')).toBeVisible()
  await expect.poll(() => boardThemeClass(page)).toContain('goban-theme-wood-light')

  await openSettings(page)
  await page.getByRole('button', { name: 'Cycle appearance mode' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByLabel('Dark board theme').selectOption('wood')
  await expect.poll(() => boardThemeClass(page)).toContain('goban-theme-wood-dark')

  await placeMoveOnBoard(page)
  await openSharePanelAndCreateLink(page)
  await page.getByRole('button', { name: 'Go to share page' }).click()
  await expect(page).toHaveURL(/\/shares\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()
  await expect.poll(() => boardThemeClass(page)).toContain('goban-theme-wood-dark')

  await page.goto('/')
  await page.getByRole('button', { name: 'Create Draft' }).click()
  await expect(page).toHaveURL(/\/drafts\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()
  await expect.poll(() => boardThemeClass(page)).toContain('goban-theme-wood-dark')
})
