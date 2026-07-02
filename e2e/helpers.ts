import { expect, type Page } from '@playwright/test'

export async function openDetailsPanel(page: Page) {
  await page.click('button[aria-label="Details"]')
  await expect(page.locator('#share-menu')).toBeVisible()
}

export async function closeDetailsPanel(page: Page) {
  await page.click('button[aria-label="Details"]')
  await expect(page.locator('#share-menu')).not.toBeVisible()
}

export async function openShareTab(page: Page) {
  await page.locator('#share-menu').getByRole('tab', { name: 'Share' }).click()
}

async function continuePastSharePrivacyDialog(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Before you create a share' })
  if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dialog.getByRole('button', { name: 'Continue to share' }).click()
  }
}

export async function openSharePanelAndCreateLink(page: Page) {
  await openDetailsPanel(page)
  await openShareTab(page)
  await continuePastSharePrivacyDialog(page)

  const copyLink = page.locator('#share-menu').getByRole('button', { name: 'Copy link' })
  const createLink = page.locator('#share-menu').getByRole('button', { name: 'Create link' })

  await expect(copyLink.or(createLink)).toBeVisible({ timeout: 15000 })
  if (await createLink.isVisible()) {
    await createLink.click()
    await continuePastSharePrivacyDialog(page)
  }

  await expect(copyLink).toBeVisible({ timeout: 15000 })
}

export async function startGame(page: Page) {
  await page.goto('/')
  await page.click('button:has-text("Record Game")')
  await expect(page).toHaveURL(/\/games\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()
}

export async function setSgfMetadata(
  page: Page,
  {
    black,
    komi,
    white,
  }: {
    black?: string
    komi?: string
    white?: string
  }
) {
  await openDetailsPanel(page)

  if (black !== undefined) {
    await page.locator('#share-menu input[placeholder="Black"]').fill(black)
    await page.locator('#share-menu input[placeholder="Black"]').blur()
  }

  if (white !== undefined) {
    await page.locator('#share-menu input[placeholder="White"]').fill(white)
    await page.locator('#share-menu input[placeholder="White"]').blur()
  }

  if (komi !== undefined) {
    await page.locator('#share-menu').getByRole('button', { name: 'Rules' }).click()
    await page.locator('#share-menu').getByRole('button', { name: `Komi ${komi}` }).click()
  }
}

export async function startGameWithMetadata(
  page: Page,
  black: string,
  white: string,
  komi?: string
) {
  await startGame(page)
  await setSgfMetadata(page, { black, komi, white })
  await closeDetailsPanel(page)
}
