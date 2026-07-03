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

async function openFullSettingsFromDialog(page: Page) {
  await openSettings(page)
  await expect(page.getByLabel('Light board theme')).toHaveCount(0)
  await expect(page.getByText('Export local data')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show more' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
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
  const gameUrl = page.url()
  await openFullSettingsFromDialog(page)
  await page.getByLabel('Light board theme').selectOption('wood')
  await page.goto(gameUrl)
  await expect(page.locator('.shudan-goban')).toBeVisible()
  await expect.poll(() => boardThemeClass(page)).toContain('goban-theme-wood-light')

  await page.reload()
  await expect(page).toHaveURL(gameUrl)
  await expect(page.locator('.shudan-goban')).toBeVisible()
  await expect.poll(() => boardThemeClass(page)).toContain('goban-theme-wood-light')

  await openFullSettingsFromDialog(page)
  await page.getByLabel('Appearance').selectOption('dark')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByLabel('Dark board theme').selectOption('wood')
  await page.goto(gameUrl)
  await expect(page.locator('.shudan-goban')).toBeVisible()
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

test('compact settings primary controls persist and Show more opens settings page', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('go-recorder:show-board-coordinates')
    localStorage.removeItem('go-recorder:two-step-placement')
    localStorage.setItem('go-recorder:theme', 'light')
  })

  await startGameWithMetadata(page, 'Black', 'White')
  const gameUrl = page.url()
  await openSettings(page)
  await expect(page.getByLabel('Light board theme')).toHaveCount(0)
  await expect(page.getByText('Export local data')).toHaveCount(0)

  await page.getByLabel('Show board coordinates').uncheck()
  await page.getByLabel('Two-step placement').check()
  await page.getByLabel('Appearance').selectOption('dark')
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.reload()
  await expect(page).toHaveURL(gameUrl)
  await openSettings(page)
  await expect(page.getByLabel('Show board coordinates')).not.toBeChecked()
  await expect(page.getByLabel('Two-step placement')).toBeChecked()
  await expect(page.getByLabel('Appearance')).toHaveValue('dark')

  await page.getByRole('button', { name: 'Show more' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByLabel('Light board theme')).toBeVisible()
  await expect(page.getByText('Export local data')).toBeVisible()
})
