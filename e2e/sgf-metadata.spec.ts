import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

async function startGameWithPlayers(page: Page, black: string, white: string) {
  await page.goto('/')
  await page.fill('input[placeholder="Black"]', black)
  await page.fill('input[placeholder="White"]', white)
  await page.click('button:has-text("Record Game")')
  await expect(page).toHaveURL(/\/games\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()
}

async function openSgfEditor(page: Page) {
  await page.click('button[aria-label="Edit SGF metadata"]')
  await expect(page.locator('text=Edit SGF metadata')).toBeVisible()
}

async function placeMoveOnBoard(page: Page) {
  const box = await page.locator('.shudan-goban').boundingBox()
  if (!box) throw new Error('goban not found')
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25)
}

test('dialog has no save button and stays open after auto-saving', async ({ page }) => {
  await startGameWithPlayers(page, 'Alice', 'Bob')
  await openSgfEditor(page)

  await expect(page.locator('button:has-text("Save")')).not.toBeVisible()

  // Komi change auto-saves and dialog stays open
  await page.selectOption('select', '7.5')
  await expect(page.locator('text=Edit SGF metadata')).toBeVisible()

  // Name blur auto-saves and dialog stays open
  await page.fill('input[placeholder="Black"]', 'Alice')
  await page.locator('input[placeholder="Black"]').blur()
  await expect(page.locator('text=Edit SGF metadata')).toBeVisible()
})

test('SGF editor persists player names and komi; swap leaves komi unchanged', async ({ page }) => {
  await startGameWithPlayers(page, 'Hana', 'Taro')
  await openSgfEditor(page)

  await page.fill('input[placeholder="Black"]', 'Hana')
  await page.locator('input[placeholder="Black"]').blur()
  await page.fill('input[placeholder="White"]', 'Taro')
  await page.locator('input[placeholder="White"]').blur()
  await page.selectOption('select', '6.5')

  // Swap should exchange only the names
  await page.click('button[aria-label="Swap players"]')
  await expect(page.locator('input[placeholder="Black"]')).toHaveValue('Taro')
  await expect(page.locator('input[placeholder="White"]')).toHaveValue('Hana')
  await expect(page.locator('select')).toHaveValue('6.5')

  // Close by toggling the editor button, then reopen to verify persistence
  await page.click('button[aria-label="Edit SGF metadata"]')
  await expect(page.locator('text=Edit SGF metadata')).not.toBeVisible()

  // Values survive a close/reopen cycle
  await openSgfEditor(page)
  await expect(page.locator('input[placeholder="Black"]')).toHaveValue('Taro')
  await expect(page.locator('input[placeholder="White"]')).toHaveValue('Hana')
  await expect(page.locator('select')).toHaveValue('6.5')
})

test('downloaded SGF contains PB, PW, and KM matching editor values', async ({ page }) => {
  await startGameWithPlayers(page, 'Hana', 'Taro')

  await openSgfEditor(page)
  await page.selectOption('select', '7.5')
  await page.click('button[aria-label="Edit SGF metadata"]')

  await placeMoveOnBoard(page)

  const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgf-'))
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button[aria-label="Share"]'),
    page.waitForSelector('#share-menu').then(() =>
      page.click('button:has-text("Download SGF")')
    ),
  ])

  const sgfPath = path.join(downloadDir, 'game.sgf')
  await download.saveAs(sgfPath)
  const content = fs.readFileSync(sgfPath, 'utf-8')

  expect(content).toContain('PB[Hana]')
  expect(content).toContain('PW[Taro]')
  expect(content).toContain('KM[7.5]')
})
