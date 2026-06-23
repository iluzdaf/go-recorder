import { test, expect } from '@playwright/test'

test('header is hidden on home page', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('header')).not.toBeVisible()
  await expect(page.locator('button[aria-label="Show header"]')).toBeVisible()
})

test('header is hidden on a draft board', async ({ page }) => {
  await page.goto('/')

  await page.click('button:has-text("Create Draft")')
  await expect(page).toHaveURL(/\/drafts\//)

  await expect(page.locator('header')).not.toBeVisible()
  await expect(page.locator('button[aria-label="Show header"]')).toBeVisible()
})

test('hamburger expands header and X collapses it', async ({ page }) => {
  await page.goto('/')

  await page.click('button[aria-label="Show header"]')
  await expect(page.locator('header')).toBeVisible()
  await expect(page.locator('button[aria-label="Show header"]')).not.toBeVisible()

  await page.click('button[aria-label="Hide header"]')
  await expect(page.locator('header')).not.toBeVisible()
  await expect(page.locator('button[aria-label="Show header"]')).toBeVisible()
})
