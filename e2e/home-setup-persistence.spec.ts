import { test, expect } from '@playwright/test'

test('home setup persists across page reload', async ({ page }) => {
  await page.goto('/')

  await page.click('button[aria-label="9 × 9"]')
  await page.getByRole('button', { name: 'Handicap 3' }).click()
  await page.click('button[aria-label="From image"]')

  await page.reload()

  await expect(page.locator('button[aria-label="9 × 9"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Handicap 3' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('button[aria-label="From image"]')).toHaveAttribute('aria-pressed', 'true')
})

test('home setup reflects updated values after change and reload', async ({ page }) => {
  await page.goto('/')
  await page.click('button[aria-label="13 × 13"]')
  await page.reload()
  await expect(page.locator('button[aria-label="13 × 13"]')).toHaveAttribute('aria-pressed', 'true')

  await page.click('button[aria-label="19 × 19"]')
  await page.reload()
  await expect(page.locator('button[aria-label="19 × 19"]')).toHaveAttribute('aria-pressed', 'true')
})

test('handicap segmented control wraps and remains selectable on narrow viewports', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')

  const firstRowButton = page.getByRole('button', { name: 'Handicap 0' })
  const secondRowButton = page.getByRole('button', { name: 'Handicap 6' })

  const firstBox = await firstRowButton.boundingBox()
  const secondBox = await secondRowButton.boundingBox()
  if (!firstBox || !secondBox) throw new Error('handicap buttons not found')

  expect(secondBox.y).toBeGreaterThan(firstBox.y)

  await firstRowButton.click()
  await expect(firstRowButton).toHaveAttribute('aria-pressed', 'true')
  await secondRowButton.click()
  await expect(secondRowButton).toHaveAttribute('aria-pressed', 'true')
})
