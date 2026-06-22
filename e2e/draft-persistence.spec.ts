import { test, expect } from '@playwright/test'

test('draft survives page refresh', async ({ page }) => {
  await page.goto('/')

  await page.click('button:has-text("Create Draft")')
  await expect(page).toHaveURL(/\/drafts\//)

  const draftUrl = page.url()

  await page.reload()

  await expect(page).toHaveURL(draftUrl)
  await expect(page.locator('.shudan-goban')).toBeVisible()
})
