import { test, expect } from '@playwright/test'

// Minimal valid 1×1 PNG — enough for the overlay to accept a file and show the detect button
const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==',
  'base64'
)

test('home → From image → overlay opens → file input and detect button appear', async ({ page }) => {
  await page.goto('/')

  await page.click('button[aria-label="From image"]')
  await page.click('button:has-text("Create Draft")')

  // Overlay is open
  await expect(page.locator('button[aria-label="Cancel"]')).toBeVisible()

  // Hidden file input is present
  const fileInput = page.locator('input[type="file"]')
  await expect(fileInput).toBeAttached()

  // Initial prompt to choose a file is visible
  await expect(page.locator('button:has-text("Choose a board photo")')).toBeVisible()

  // Select an image → detect button should appear
  await fileInput.setInputFiles({
    name: 'test-board.png',
    mimeType: 'image/png',
    buffer: MINIMAL_PNG,
  })

  await expect(page.locator('button:has-text("Detect Position")')).toBeVisible()
})
