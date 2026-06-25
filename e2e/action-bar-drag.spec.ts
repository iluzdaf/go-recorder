import { test, expect } from '@playwright/test'

test('action bar can be dragged left to right in landscape orientation', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/')
  await page.click('button:has-text("Record Game")')
  await expect(page).toHaveURL(/\/games\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()

  const handle = page.locator('.cursor-grab')
  await expect(handle).toBeVisible()

  const handleBox = await handle.boundingBox()
  if (!handleBox) throw new Error('drag handle not found')

  const viewport = page.viewportSize()!
  // Drag past the midpoint so the anchor snaps to the right
  const targetX = viewport.width * 0.75

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetX, handleBox.y + handleBox.height / 2, { steps: 20 })
  await page.mouse.up()

  // After snapping to the right, the handle should be in the right half of the screen
  const newHandleBox = await handle.boundingBox()
  if (!newHandleBox) throw new Error('drag handle not found after drag')
  expect(newHandleBox.x + newHandleBox.width / 2).toBeGreaterThan(viewport.width / 2)
})

test('action bar can be dragged right to left in landscape orientation', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/')
  await page.click('button:has-text("Record Game")')
  await expect(page).toHaveURL(/\/games\//)
  await expect(page.locator('.shudan-goban')).toBeVisible()

  const handle = page.locator('.cursor-grab')
  await expect(handle).toBeVisible()

  // First drag to the right
  const handleBox = await handle.boundingBox()
  if (!handleBox) throw new Error('drag handle not found')
  const viewport = page.viewportSize()!

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(viewport.width * 0.75, handleBox.y + handleBox.height / 2, { steps: 20 })
  await page.mouse.up()

  // Now drag back to the left
  const rightHandleBox = await handle.boundingBox()
  if (!rightHandleBox) throw new Error('drag handle not found after first drag')

  await page.mouse.move(rightHandleBox.x + rightHandleBox.width / 2, rightHandleBox.y + rightHandleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(viewport.width * 0.25, rightHandleBox.y + rightHandleBox.height / 2, { steps: 20 })
  await page.mouse.up()

  // Handle should be back in the left half
  const finalHandleBox = await handle.boundingBox()
  if (!finalHandleBox) throw new Error('drag handle not found after second drag')
  expect(finalHandleBox.x + finalHandleBox.width / 2).toBeLessThan(viewport.width / 2)
})
