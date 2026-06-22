import { test, expect } from '@playwright/test'

test('blank draft creates no IndexedDB image entry', async ({ page }) => {
  await page.goto('/')

  await page.click('button:has-text("Create Draft")')
  await expect(page).toHaveURL(/\/drafts\//)

  const imageCount = await page.evaluate((): Promise<number> => {
    return new Promise((resolve) => {
      const request = window.indexedDB.open('go-recorder-images', 1)
      let isNew = false

      request.onupgradeneeded = () => {
        isNew = true
      }

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (isNew || !db.objectStoreNames.contains('image-sources')) {
          db.close()
          resolve(0)
          return
        }
        const tx = db.transaction('image-sources', 'readonly')
        const countReq = tx.objectStore('image-sources').count()
        countReq.onsuccess = () => {
          db.close()
          resolve(countReq.result)
        }
        countReq.onerror = () => {
          db.close()
          resolve(0)
        }
      }

      request.onerror = () => resolve(0)
    })
  })

  expect(imageCount).toBe(0)
})
