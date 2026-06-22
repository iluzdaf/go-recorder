import { test, expect } from '@playwright/test'

test('no regression on second draft creation', async ({ page }) => {
  await page.goto('/')

  await page.click('button:has-text("Create Draft")')
  await expect(page).toHaveURL(/\/drafts\//)
  const firstDraftUrl = page.url()

  await page.goto('/')

  await page.click('button:has-text("Create Draft")')
  await expect(page).toHaveURL(/\/drafts\//)
  const secondDraftUrl = page.url()

  expect(firstDraftUrl).not.toBe(secondDraftUrl)
  await expect(page.locator('.shudan-goban')).toBeVisible()

  await page.goto(firstDraftUrl)
  await expect(page.locator('.shudan-goban')).toBeVisible()
})
