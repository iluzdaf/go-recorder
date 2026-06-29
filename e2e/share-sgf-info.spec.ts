import { test, expect, type Page } from '@playwright/test'
import { closeDetailsPanel, openSharePanelAndCreateLink, setSgfMetadata, startGame, startGameWithMetadata } from './helpers'

async function placeMoveOnBoard(page: Page) {
    const box = await page.locator('.shudan-goban').boundingBox()
    if (!box) throw new Error('goban not found')
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25)
}

async function navigateToSharePage(page: Page) {
    await openSharePanelAndCreateLink(page)
    await page.click('button[aria-label="Go to share page"]')
    await expect(page).toHaveURL(/\/shares\//)
    await page.locator('button[aria-label="Details"]').waitFor()
}

async function clickSgfButton(page: Page) {
    await page.locator('button[aria-label="Details"]').click()
}

test('shared board SGF panel shows player names and komi', async ({ page }) => {
    await startGame(page)
    await setSgfMetadata(page, {
        black: 'AlphaGo',
        komi: '7.5',
        white: 'Lee Sedol',
    })
    await closeDetailsPanel(page)

    await placeMoveOnBoard(page)
    await navigateToSharePage(page)
    await clickSgfButton(page)

    const panel = page.locator('dl')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('AlphaGo')
    await expect(panel).toContainText('Lee Sedol')
    await expect(panel).toContainText('7.5')
})

test('shared board SGF button toggles the panel open and closed', async ({ page }) => {
    await startGameWithMetadata(page, 'AlphaGo', 'Lee Sedol')
    await placeMoveOnBoard(page)
    await navigateToSharePage(page)

    await clickSgfButton(page)
    await expect(page.locator('dl')).toBeVisible()

    await clickSgfButton(page)
    await expect(page.locator('dl')).not.toBeVisible()
})

test('shared board SGF panel shows placeholders when player names are absent', async ({ page }) => {
    await startGame(page)

    await placeMoveOnBoard(page)
    await navigateToSharePage(page)
    await clickSgfButton(page)

    const panel = page.locator('dl')
    await expect(panel).toBeVisible()
    await expect(panel.locator('span.italic')).toHaveCount(2)
})
