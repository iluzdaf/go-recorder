import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { openDetailsPanel, startGameWithMetadata } from './helpers'


async function expandRules(page: Page) {
  await page.locator('#share-menu').getByRole('button', { name: 'Rules' }).click()
}

async function expandPlayers(page: Page) {
  await page.locator('#share-menu').getByRole('button', { name: 'Players' }).click()
}

async function placeMoveOnBoard(page: Page) {
  const box = await page.locator('.shudan-goban').boundingBox()
  if (!box) throw new Error('goban not found')
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25)
}

test('panel has no save button and stays open after auto-saving', async ({ page }) => {
  await startGameWithMetadata(page, 'Alice', 'Bob')
  await openDetailsPanel(page)

  await expect(page.locator('button:has-text("Save")')).not.toBeVisible()

  // Komi change auto-saves and panel stays open
  await expandRules(page)
  await page.locator('#share-menu select').selectOption('7.5')
  await expect(page.locator('#share-menu')).toBeVisible()

  // Name blur auto-saves and panel stays open
  await expandPlayers(page)
  await page.locator('#share-menu input[placeholder="Black"]').fill('Alice')
  await page.locator('#share-menu input[placeholder="Black"]').blur()
  await expect(page.locator('#share-menu')).toBeVisible()
})

test('SGF panel persists player names and komi; swap leaves komi unchanged', async ({ page }) => {
  await startGameWithMetadata(page, 'Hana', 'Taro')
  await openDetailsPanel(page)

  await page.locator('#share-menu input[placeholder="Black"]').fill('Hana')
  await page.locator('#share-menu input[placeholder="Black"]').blur()
  await page.locator('#share-menu input[placeholder="White"]').fill('Taro')
  await page.locator('#share-menu input[placeholder="White"]').blur()
  await expandRules(page)
  await page.locator('#share-menu select').selectOption('6.5')

  // Swap should exchange only the names
  await expandPlayers(page)
  await page.locator('#share-menu').getByRole('button', { name: 'Swap players' }).click()
  await expect(page.locator('#share-menu input[placeholder="Black"]')).toHaveValue('Taro')
  await expect(page.locator('#share-menu input[placeholder="White"]')).toHaveValue('Hana')
  await expandRules(page)
  await expect(page.locator('#share-menu select')).toHaveValue('6.5')

  // Close and reopen to verify persistence
  await page.click('button[aria-label="Details"]')
  await expect(page.locator('#share-menu')).not.toBeVisible()

  await openDetailsPanel(page)
  await expect(page.locator('#share-menu input[placeholder="Black"]')).toHaveValue('Taro')
  await expect(page.locator('#share-menu input[placeholder="White"]')).toHaveValue('Hana')
  await expandRules(page)
  await expect(page.locator('#share-menu select')).toHaveValue('6.5')
})

test('downloaded SGF contains PB, PW, and KM matching panel values', async ({ page }) => {
  await startGameWithMetadata(page, 'Hana', 'Taro')

  await openDetailsPanel(page)
  await expandRules(page)
  await page.locator('#share-menu select').selectOption('7.5')
  await page.click('button[aria-label="Details"]')
  await expect(page.locator('#share-menu')).not.toBeVisible()

  await placeMoveOnBoard(page)

  const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgf-'))
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button[aria-label="Details"]'),
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
