import { test, expect, type Page } from '@playwright/test'

function boxCenter(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function dragBetween(page: Page, fromLabel: string, toLabel: string) {
  const fromBox = await page.locator(`button[aria-label="${fromLabel}"]`).boundingBox()
  const toBox = await page.locator(`button[aria-label="${toLabel}"]`).boundingBox()
  if (!fromBox || !toBox) throw new Error('segmented control buttons not found')

  const from = boxCenter(fromBox)
  const to = boxCenter(toBox)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  const steps = 8
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps
    )
  }
  await page.mouse.up()
}

test('segmented controls select while dragging across segments', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('button[aria-label="19 × 19"]')).toHaveAttribute('aria-pressed', 'true')

  // Board size: drag across a single row.
  await dragBetween(page, '19 × 19', '9 × 9')
  await expect(page.locator('button[aria-label="9 × 9"]')).toHaveAttribute('aria-pressed', 'true')

  // Handicap wraps onto two rows; dragging across rows still tracks the pointer.
  await dragBetween(page, 'Handicap 0', 'Handicap 9')
  await expect(page.getByRole('button', { name: 'Handicap 9' })).toHaveAttribute('aria-pressed', 'true')

  // Draft source (icon segments).
  await dragBetween(page, 'Blank', 'From image')
  await expect(page.locator('button[aria-label="From image"]')).toHaveAttribute('aria-pressed', 'true')

  // Tapping a segment still selects it.
  await page.locator('button[aria-label="Blank"]').click()
  await expect(page.locator('button[aria-label="Blank"]')).toHaveAttribute('aria-pressed', 'true')

  // Keyboard activation still selects.
  await page.locator('button[aria-label="13 × 13"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('button[aria-label="13 × 13"]')).toHaveAttribute('aria-pressed', 'true')
})
