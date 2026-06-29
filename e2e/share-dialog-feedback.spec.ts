import { test, expect, type Page } from '@playwright/test'
import { openDetailsPanel, openSharePanelAndCreateLink, openShareTab } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('go-recorder:share-privacy-acknowledged:v1', 'true')
  })
  await page.route('**/api/shares', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ slug: `share-dialog-feedback-${Date.now()}` }),
    })
  })
})

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
  await openSharePanelAndCreateLink(page)
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

test('board input and tab switching are blocked while creating a link', async ({ page }) => {
  await page.unroute('**/api/shares')

  let releaseShareRequest!: () => void
  const shareRequestCanFinish = new Promise<void>((resolve) => {
    releaseShareRequest = resolve
  })
  let resolveShareRequestStarted!: () => void
  const shareRequestStarted = new Promise<void>((resolve) => {
    resolveShareRequestStarted = resolve
  })
  await page.route('**/api/shares', async (route) => {
    resolveShareRequestStarted()
    await shareRequestCanFinish
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ slug: 'blocked-input-share' }),
    })
  })

  await createShareableDraft(page)

  const goban = page.locator('.shudan-goban')
  const stones = goban.locator('.shudan-vertex.shudan-sign_1, .shudan-vertex.shudan-sign_-1')
  const stonesBefore = await stones.count()

  await openDetailsPanel(page)
  await openShareTab(page)
  await shareRequestStarted

  await expect(page.locator('#share-menu').getByText('Creating share...')).toBeVisible()
  await expect(page.locator('#share-menu').getByRole('tab', { name: 'SGF' })).toBeDisabled()
  await expect(page.locator('#share-menu').getByRole('tab', { name: 'Share' })).toBeDisabled()
  await expect(page.locator('#share-menu').getByRole('tab', { name: 'Share' })).toHaveAttribute('aria-selected', 'true')

  const box = await goban.boundingBox()
  if (!box) throw new Error('Board was not visible')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

  await expect(stones).toHaveCount(stonesBefore)
  await expect(page.locator('#share-menu').getByRole('tab', { name: 'Share' })).toHaveAttribute('aria-selected', 'true')

  releaseShareRequest()
  await expect(page.locator('#share-menu').getByRole('button', { name: 'Copy link' })).toBeVisible()
})
