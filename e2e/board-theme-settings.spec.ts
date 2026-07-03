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
  await expect(page.getByRole('group', { name: 'Light board theme' })).toHaveCount(0)
  await expect(page.getByText('Export local data')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show more' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

async function chooseSegment(page: Page, groupName: string, optionName: string) {
  const group = page.getByRole('group', { name: groupName })
  await group.getByRole('button', { name: `${groupName}: ${optionName}` }).click()
}

async function expectSegmentSelected(page: Page, groupName: string, optionName: string) {
  const group = page.getByRole('group', { name: groupName })
  await expect(group.getByRole('button', { name: `${groupName}: ${optionName}` })).toHaveAttribute('aria-pressed', 'true')
}

async function expectAppSectionAboveBoard(page: Page) {
  const appBox = await page.getByRole('button', { name: 'App' }).boundingBox()
  const boardBox = await page.getByRole('button', { name: 'Board' }).boundingBox()

  if (!appBox || !boardBox) {
    throw new Error('settings section headers were not visible')
  }

  expect(appBox.y).toBeLessThan(boardBox.y)
}

async function openSettingsGroup(page: Page, groupName: 'Board' | 'App') {
  const groupButton = page.getByRole('button', { name: groupName })
  if ((await groupButton.getAttribute('aria-expanded')) !== 'true') {
    await groupButton.click()
  }
  await expect(groupButton).toHaveAttribute('aria-expanded', 'true')
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
  await expect(page.getByRole('button', { name: 'App' })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'App' })).toBeVisible()
  await expectAppSectionAboveBoard(page)
  await chooseSegment(page, 'Light board theme', 'Wood')
  await expectSegmentSelected(page, 'Light board theme', 'Wood')
  await page.goto(gameUrl)
  await expect(page.locator('.shudan-goban')).toBeVisible()
  await expect.poll(() => boardThemeClass(page)).toContain('goban-theme-wood-light')

  await page.reload()
  await expect(page).toHaveURL(gameUrl)
  await expect(page.locator('.shudan-goban')).toBeVisible()
  await expect.poll(() => boardThemeClass(page)).toContain('goban-theme-wood-light')

  await openFullSettingsFromDialog(page)
  await openSettingsGroup(page, 'App')
  await expect(page.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-expanded', 'true')
  await chooseSegment(page, 'Appearance', 'Dark')
  await expectSegmentSelected(page, 'Appearance', 'Dark')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await openSettingsGroup(page, 'Board')
  await expect(page.getByRole('button', { name: 'App' })).toHaveAttribute('aria-expanded', 'true')
  await chooseSegment(page, 'Dark board theme', 'Wood')
  await expectSegmentSelected(page, 'Dark board theme', 'Wood')
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
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('go-recorder:show-board-coordinates')
    localStorage.removeItem('go-recorder:two-step-placement')
    localStorage.setItem('go-recorder:theme', 'light')
  })

  await startGameWithMetadata(page, 'Black', 'White')
  const gameUrl = page.url()
  await openSettings(page)
  await expect(page.getByRole('button', { name: 'App' })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('group', { name: 'Light board theme' })).toHaveCount(0)
  await expect(page.getByText('Export local data')).toHaveCount(0)

  await openSettingsGroup(page, 'Board')
  await page.getByLabel('Show board coordinates').uncheck()
  await page.getByLabel('Two-step placement').check()
  await openSettingsGroup(page, 'App')
  await chooseSegment(page, 'Appearance', 'Dark')
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.reload()
  await expect(page).toHaveURL(gameUrl)
  await openSettings(page)
  await openSettingsGroup(page, 'Board')
  await expect(page.getByLabel('Show board coordinates')).not.toBeChecked()
  await expect(page.getByLabel('Two-step placement')).toBeChecked()
  await openSettingsGroup(page, 'App')
  await expectSegmentSelected(page, 'Appearance', 'Dark')

  await page.getByRole('button', { name: 'Show more' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'App' })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-expanded', 'true')
  await expectAppSectionAboveBoard(page)
  await openSettingsGroup(page, 'Board')
  await expect(page.getByRole('group', { name: 'Light board theme' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Dark board theme' })).toBeVisible()
  await openSettingsGroup(page, 'App')
  await expect(page.getByText('Export local data')).toBeVisible()
})
