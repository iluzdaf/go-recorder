import { test, expect, type Page } from '@playwright/test'

async function startGameWithPlayers(page: Page, black: string, white: string) {
    await page.goto('/')
    await page.fill('input[placeholder="Black"]', black)
    await page.fill('input[placeholder="White"]', white)
    await page.click('button:has-text("Record Game")')
    await expect(page).toHaveURL(/\/games\//)
    await expect(page.locator('.shudan-goban')).toBeVisible()
}

async function placeMoveOnBoard(page: Page) {
    const box = await page.locator('.shudan-goban').boundingBox()
    if (!box) throw new Error('goban not found')
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25)
}

async function navigateToSharePage(page: Page) {
    await page.click('button[aria-label="Share"]')
    await expect(page.locator('#share-menu')).toBeVisible()
    const createLink = page.locator('#share-menu button[aria-label="Create link"]')
    const copyLink = page.locator('#share-menu button[aria-label="Copy link"]')
    if (await createLink.isVisible()) await createLink.click()
    await expect(copyLink).toBeVisible({ timeout: 15000 })
    await page.click('button[aria-label="Go to share page"]')
    await expect(page).toHaveURL(/\/shares\//)
    // next dev portal intercepts synthesized pointer events; use native click
    await page.locator('button[aria-label="SGF"]').waitFor()
}

async function clickSgfButton(page: Page) {
    await page.evaluate(() =>
        (document.querySelector('button[aria-label="SGF"]') as HTMLElement).click()
    )
}

test('shared board SGF panel shows player names and komi', async ({ page }) => {
    await startGameWithPlayers(page, 'AlphaGo', 'Lee Sedol')

    await page.click('button[aria-label="Edit SGF metadata"]')
    await expect(page.locator('text=Edit SGF metadata')).toBeVisible()
    await page.selectOption('select', '7.5')
    await page.click('button[aria-label="Edit SGF metadata"]')

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
    await startGameWithPlayers(page, 'AlphaGo', 'Lee Sedol')
    await placeMoveOnBoard(page)
    await navigateToSharePage(page)

    await clickSgfButton(page)
    await expect(page.locator('dl')).toBeVisible()

    await clickSgfButton(page)
    await expect(page.locator('dl')).not.toBeVisible()
})

test('shared board SGF panel shows placeholders when player names are absent', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[placeholder="Black"]', '')
    await page.fill('input[placeholder="White"]', '')
    await page.click('button:has-text("Record Game")')
    await expect(page).toHaveURL(/\/games\//)

    await placeMoveOnBoard(page)
    await navigateToSharePage(page)
    await clickSgfButton(page)

    const panel = page.locator('dl')
    await expect(panel).toBeVisible()
    await expect(panel.locator('span.italic')).toHaveCount(2)
})
