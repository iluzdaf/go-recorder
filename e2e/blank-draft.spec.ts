import { test, expect } from '@playwright/test'

test('home → create blank draft → board renders', async ({ page }) => {
  await page.goto('/')

  await page.click('button:has-text("Create Draft")')

  await expect(page).toHaveURL(/\/drafts\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()
})
