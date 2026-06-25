import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'

const MINIMAL_PNG_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg=='

async function openSettings(page: Page) {
    await page.click('button[aria-label="Show header"]')
    await page.click('button[aria-label="Settings"]')
}

async function clearLocalGameRecords(page: Page) {
    await page.evaluate(() => {
        const keys: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith('go-recorder:local-game:')) keys.push(key)
        }
        for (const key of keys) localStorage.removeItem(key)
    })
}

async function clearImageSources(page: Page) {
    await page.evaluate((): Promise<void> => {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open('go-recorder-images', 1)
            request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                if (!db.objectStoreNames.contains('image-sources')) {
                    db.close()
                    resolve()
                    return
                }
                const tx = db.transaction('image-sources', 'readwrite')
                tx.objectStore('image-sources').clear()
                tx.oncomplete = () => { db.close(); resolve() }
                tx.onerror = () => { db.close(); reject(new Error('clear failed')) }
            }
            request.onerror = () => reject(new Error('open failed'))
        })
    })
}

async function getImageSourceCount(page: Page): Promise<number> {
    return page.evaluate((): Promise<number> => {
        return new Promise((resolve) => {
            const request = window.indexedDB.open('go-recorder-images', 1)
            let isNew = false
            request.onupgradeneeded = () => { isNew = true }
            request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                if (isNew || !db.objectStoreNames.contains('image-sources')) {
                    db.close()
                    resolve(0)
                    return
                }
                const tx = db.transaction('image-sources', 'readonly')
                const countReq = tx.objectStore('image-sources').count()
                countReq.onsuccess = () => { db.close(); resolve(countReq.result) }
                countReq.onerror = () => { db.close(); resolve(0) }
            }
            request.onerror = () => resolve(0)
        })
    })
}

test('export and import restores local games and drafts', async ({ page }) => {
    await page.goto('/')

    await page.evaluate(() => {
        const now = new Date().toISOString()
        const game = {
            recordKind: 'game',
            id: 'migration-test-game',
            boardSize: 19,
            gameState: { setupStones: [], moves: [], currentPlayer: 'B' },
            blackPlayerName: 'MigrationTestBlack',
            whitePlayerName: 'MigrationTestWhite',
            handicap: 0,
            komi: 6.5,
            createdAt: now,
            updatedAt: now,
            lastShareSlug: null,
        }
        const draft = {
            recordKind: 'draft',
            draftKind: 'board',
            id: 'migration-test-draft',
            boardSize: 19,
            gameState: { setupStones: [], moves: [], currentPlayer: 'B' },
            blackPlayerName: null,
            whitePlayerName: null,
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
        localStorage.setItem('go-recorder:local-game:migration-test-game', JSON.stringify(game))
        localStorage.setItem('go-recorder:local-game:migration-test-draft', JSON.stringify(draft))
    })

    await page.reload()

    // Export
    await openSettings(page)
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export local data")')
    const download = await downloadPromise
    const exportedJson = fs.readFileSync((await download.path())!, 'utf-8')
    const payload = JSON.parse(exportedJson)
    expect(payload.games).toHaveLength(1)
    expect(payload.drafts).toHaveLength(1)

    // Clear records and reload
    await clearLocalGameRecords(page)
    await page.reload()
    await expect(page.locator('text=MigrationTestBlack')).not.toBeVisible()

    // Import
    await openSettings(page)
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.click('button:has-text("Import local data")')
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
        name: 'export.json',
        mimeType: 'application/json',
        buffer: Buffer.from(exportedJson),
    })

    await expect(page.locator('text=Imported local data')).toBeVisible()

    // Close settings and verify records appear on home page
    await page.click('button[aria-label="Hide header"]')
    await expect(page.locator('text=MigrationTestBlack')).toBeVisible()
    await expect(page.locator('button[aria-label="Draft"]')).toBeVisible()
})

test('export and import preserves image source for image-created draft', async ({ page }) => {
    await page.goto('/')

    const imageSourceId = 'migration-test-image-source'
    const imageSource = {
        id: imageSourceId,
        dataUrl: MINIMAL_PNG_DATA_URL,
        naturalWidth: 1,
        naturalHeight: 1,
        corners: [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 },
        ],
    }

    // Seed the image source into IndexedDB
    await page.evaluate((imageSource) => {
        return new Promise<void>((resolve, reject) => {
            const request = window.indexedDB.open('go-recorder-images', 1)
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                if (!db.objectStoreNames.contains('image-sources')) {
                    db.createObjectStore('image-sources', { keyPath: 'id' })
                }
            }
            request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                const tx = db.transaction('image-sources', 'readwrite')
                tx.objectStore('image-sources').put(imageSource)
                tx.oncomplete = () => { db.close(); resolve() }
                tx.onerror = () => { db.close(); reject(new Error('put failed')) }
            }
            request.onerror = () => reject(new Error('open failed'))
        })
    }, imageSource)

    // Seed the draft referencing the image source
    await page.evaluate((imageSourceId) => {
        const now = new Date().toISOString()
        const draft = {
            recordKind: 'draft',
            draftKind: 'board',
            id: 'migration-test-image-draft',
            boardSize: 19,
            gameState: { setupStones: [], moves: [], currentPlayer: 'B' },
            blackPlayerName: null,
            whitePlayerName: null,
            handicap: 0,
            komi: 6.5,
            createdAt: now,
            updatedAt: now,
            lastShareSlug: null,
            parentShareSlug: null,
            baseMoveCount: null,
            positionView: null,
            imageSourceId,
        }
        localStorage.setItem('go-recorder:local-game:migration-test-image-draft', JSON.stringify(draft))
    }, imageSourceId)

    await page.reload()

    // Export — verify the image source is included and not missing
    await openSettings(page)
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export local data")')
    const download = await downloadPromise
    const exportedJson = fs.readFileSync((await download.path())!, 'utf-8')
    const payload = JSON.parse(exportedJson)
    expect(payload.imageSources).toHaveLength(1)
    expect(payload.missingImageSourceIds).toHaveLength(0)

    // Clear everything and reload
    await clearLocalGameRecords(page)
    await clearImageSources(page)
    await page.reload()
    expect(await getImageSourceCount(page)).toBe(0)

    // Import
    await openSettings(page)
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.click('button:has-text("Import local data")')
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
        name: 'export.json',
        mimeType: 'application/json',
        buffer: Buffer.from(exportedJson),
    })

    await expect(page.locator('text=Imported local data')).toBeVisible()
    expect(await getImageSourceCount(page)).toBe(1)

    // Navigate to the imported draft and verify the source image overlay is available
    await page.click('button[aria-label="Hide header"]')
    await page.locator('button[aria-label="Draft"]').first().click()
    await expect(page).toHaveURL(/\/drafts\//)
    await expect(page.locator('button[aria-label="Show source image"]')).toBeVisible()
})
