import { test, expect, type Page } from '@playwright/test'

const HOME_RECENT_LOAD_DELAY_MS = 250

async function seedRecentRecords(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('go-recorder:e2e-home-recent-seeded') === 'true') {
      return
    }

    const now = '2026-06-05T12:00:00.000Z'
    const game = {
      recordKind: 'game',
      id: 'home-recent-game',
      boardSize: 19,
      gameState: {
        setupStones: [],
        moves: [{ type: 'play', x: 3, y: 3, color: 'B' }],
        currentPlayer: 'W',
      },
      blackPlayerName: 'Home Black',
      whitePlayerName: 'Home White',
      handicap: 0,
      komi: 6.5,
      createdAt: now,
      updatedAt: now,
      lastShareSlug: null,
    }
    const draft = {
      recordKind: 'draft',
      draftKind: 'board',
      id: 'home-recent-draft',
      boardSize: 19,
      gameState: { setupStones: [], moves: [], currentPlayer: 'B' },
      blackPlayerName: 'Draft Black',
      whitePlayerName: 'Draft White',
      handicap: 0,
      komi: 6.5,
      createdAt: now,
      updatedAt: now,
      lastShareSlug: null,
      parentShareSlug: null,
      baseMoveCount: null,
      positionView: null,
      imageSourceId: null,
    }

    localStorage.setItem(
      'go-recorder:local-game:home-recent-game',
      JSON.stringify(game)
    )
    localStorage.setItem(
      'go-recorder:local-game:home-recent-draft',
      JSON.stringify(draft)
    )
    localStorage.setItem('go-recorder:e2e-home-recent-seeded', 'true')
  })
}

async function delayHomeRecentLoad(page: Page) {
  await page.addInitScript((delayMs) => {
    const originalSetTimeout = window.setTimeout
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      const nextTimeout = timeout === 0 ? delayMs : timeout
      return originalSetTimeout(handler, nextTimeout, ...args)
    }) as typeof window.setTimeout
  }, HOME_RECENT_LOAD_DELAY_MS)
}

async function expectSeededRecentItems(page: Page) {
  await expect(page.getByRole('button', { name: 'Home Black vs Home White' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Draft Black vs Draft White' })).toBeVisible()
}

test('home recent game and draft rows keep card height stable while loading', async ({ page }) => {
  await seedRecentRecords(page)
  await delayHomeRecentLoad(page)

  await page.goto('/')

  const recordCard = page.getByTestId('record-game-card')
  const draftCard = page.getByTestId('create-draft-card')
  const gameSection = page.getByTestId('recent-games-section')
  const draftSection = page.getByTestId('recent-drafts-section')

  await expect(gameSection).toHaveAttribute('aria-busy', 'true')
  await expect(draftSection).toHaveAttribute('aria-busy', 'true')

  const recordLoadingBox = await recordCard.boundingBox()
  const draftLoadingBox = await draftCard.boundingBox()
  if (!recordLoadingBox || !draftLoadingBox) {
    throw new Error('home cards were not visible during recent-item loading')
  }

  await expectSeededRecentItems(page)
  await expect(gameSection).toHaveAttribute('aria-busy', 'false')
  await expect(draftSection).toHaveAttribute('aria-busy', 'false')

  const recordLoadedBox = await recordCard.boundingBox()
  const draftLoadedBox = await draftCard.boundingBox()
  if (!recordLoadedBox || !draftLoadedBox) {
    throw new Error('home cards were not visible after recent items loaded')
  }

  expect(Math.abs(recordLoadedBox.height - recordLoadingBox.height)).toBeLessThanOrEqual(4)
  expect(Math.abs(draftLoadedBox.height - draftLoadingBox.height)).toBeLessThanOrEqual(4)
})

test('home hides recent sections after an empty loading pass', async ({ page }) => {
  await delayHomeRecentLoad(page)

  await page.goto('/')

  await expect(page.getByTestId('recent-games-section')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByTestId('recent-drafts-section')).toHaveAttribute('aria-busy', 'true')

  await expect(page.getByTestId('recent-games-section')).not.toBeVisible()
  await expect(page.getByTestId('recent-drafts-section')).not.toBeVisible()
  await expect(page.getByText('Recent games')).not.toBeVisible()
  await expect(page.getByText('Recent drafts')).not.toBeVisible()
})

test('home recent rows render and navigate on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 })
  await seedRecentRecords(page)

  await page.goto('/')

  await expectSeededRecentItems(page)

  await page.getByRole('button', { name: 'Home Black vs Home White' }).click()
  await expect(page).toHaveURL(/\/games\/home-recent-game$/)

  await page.goto('/')
  await page.getByRole('button', { name: 'Draft Black vs Draft White' }).click()
  await expect(page).toHaveURL(/\/drafts\/home-recent-draft$/)
})

test('home recent delete removes games and drafts from all list surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 })
  await seedRecentRecords(page)

  await page.goto('/')
  await expectSeededRecentItems(page)

  const gameRow = page.getByRole('button', { name: /Home Black vs Home White/ })
  const gameRowBox = await gameRow.boundingBox()
  if (!gameRowBox) {
    throw new Error('game recent row was not visible before delete drag')
  }

  await page.mouse.move(gameRowBox.x + gameRowBox.width - 18, gameRowBox.y + gameRowBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(gameRowBox.x + gameRowBox.width - 80, gameRowBox.y + gameRowBox.height / 2)
  await page.mouse.up()

  const deleteGameButton = page.getByRole('button', { name: 'Delete game' })
  await expect(deleteGameButton).toBeVisible()
  await deleteGameButton.click()
  await expect(page.getByRole('button', { name: 'Home Black vs Home White' })).not.toBeVisible()

  await page.goto('/games')
  await expect(page).toHaveURL(/\/games$/)
  await expect(page.getByText('No game recordings yet.')).toBeVisible()

  await page.goto('/')
  const draftRow = page.getByRole('button', { name: /Draft Black vs Draft White/ })
  const draftRowBox = await draftRow.boundingBox()
  if (!draftRowBox) {
    throw new Error('draft recent row was not visible before delete drag')
  }

  await page.mouse.move(draftRowBox.x + draftRowBox.width - 18, draftRowBox.y + draftRowBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(draftRowBox.x + draftRowBox.width - 80, draftRowBox.y + draftRowBox.height / 2)
  await page.mouse.up()

  const deleteDraftButton = page.getByRole('button', { name: 'Delete draft' })
  await expect(deleteDraftButton).toBeVisible()
  await deleteDraftButton.click()
  await expect(page.getByRole('button', { name: 'Draft Black vs Draft White' })).not.toBeVisible()

  await page.goto('/drafts')
  await expect(page).toHaveURL(/\/drafts$/)
  await expect(page.getByText('No drafts yet.')).toBeVisible()
})
