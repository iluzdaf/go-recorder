import { test, expect } from '@playwright/test'

test('home setup persists across page reload', async ({ page }) => {
  await page.goto('/')

  await page.click('button[aria-label="9 × 9"]')
  await page.fill('input[placeholder="Black"]', 'Alice')
  await page.fill('input[placeholder="White"]', 'Bob')
  await page.selectOption('select', '3')
  await page.click('button[aria-label="From image"]')

  await page.reload()

  await expect(page.locator('button[aria-label="9 × 9"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('input[placeholder="Black"]')).toHaveValue('Alice')
  await expect(page.locator('input[placeholder="White"]')).toHaveValue('Bob')
  await expect(page.locator('select')).toHaveValue('3')
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
