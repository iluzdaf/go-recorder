import { describe, expect, it } from "vitest";

import type { FinalPosition, ShareRecord } from "../components/types";
import {
    STATIC_BOARD_THEME_LIGHT,
    buildStaticBoardSvg,
    getShareStaticBoardImages,
    getStaticBoardModel,
} from "../lib/shareBoardStaticSvg";

function emptyBoard(size: number): FinalPosition {
    return Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 0 as -1 | 0 | 1)
    );
}

function baseShare(overrides: Partial<ShareRecord> = {}): ShareRecord {
    return {
        slug: "s",
        sourceKind: "game",
        boardSize: 9,
        gameState: { setupStones: [], moves: [], currentPlayer: "B" },
        blackPlayerName: null,
        whitePlayerName: null,
        handicap: 0,
        positionView: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

describe("getStaticBoardModel", () => {
    it("derives visible stones, the last-move flag, and star points", () => {
        const finalPosition = emptyBoard(9);
        finalPosition[2][2] = 1; // black at x=2,y=2
        finalPosition[6][6] = -1; // white at x=6,y=6

        const model = getStaticBoardModel(
            baseShare({
                finalPosition,
                gameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 2, y: 2, color: "B" },
                        { type: "play", x: 6, y: 6, color: "W" },
                    ],
                    currentPlayer: "B",
                },
            })
        );

        expect(model.columns).toBe(9);
        expect(model.rows).toBe(9);
        expect(model.stones).toContainEqual({ col: 2, row: 2, sign: 1 });
        expect(model.stones).toContainEqual({
            col: 6,
            row: 6,
            sign: -1,
            lastMove: true,
        });
        // 9x9 star points: [2,4,6] x [2,4,6]
        expect(model.hoshi).toHaveLength(9);
        expect(model.hoshi).toContainEqual({ col: 4, row: 4 });
    });

    it("crops and localises coordinates for a position view", () => {
        const finalPosition = emptyBoard(9);
        finalPosition[2][2] = 1;

        const model = getStaticBoardModel(
            baseShare({
                sourceKind: "draft",
                draftKind: "board",
                finalPosition,
                positionView: { anchor: "center", rows: 5, columns: 5 },
            })
        );

        // center 5x5 of a 9x9 starts at (2,2), so board (2,2) -> local (0,0)
        expect(model.columns).toBe(5);
        expect(model.rows).toBe(5);
        expect(model.stones).toContainEqual({ col: 0, row: 0, sign: 1 });
    });

    it("labels variation moves instead of marking a last move", () => {
        const finalPosition = emptyBoard(9);
        finalPosition[0][0] = 1;
        finalPosition[1][1] = -1;

        const model = getStaticBoardModel(
            baseShare({
                sourceKind: "draft",
                draftKind: "variation",
                parentShareSlug: "parent",
                baseMoveCount: 0,
                finalPosition,
                gameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 0, y: 0, color: "B" },
                        { type: "play", x: 1, y: 1, color: "W" },
                    ],
                    currentPlayer: "B",
                },
            })
        );

        expect(model.stones).toContainEqual({ col: 0, row: 0, sign: 1, label: "1" });
        expect(model.stones).toContainEqual({
            col: 1,
            row: 1,
            sign: -1,
            label: "2",
        });
        expect(model.stones.every((stone) => !stone.lastMove)).toBe(true);
    });
});

describe("buildStaticBoardSvg", () => {
    it("emits a themed, gutter-inclusive board with stones", () => {
        const svg = buildStaticBoardSvg(
            {
                columns: 9,
                rows: 9,
                stones: [
                    { col: 2, row: 2, sign: 1 },
                    { col: 6, row: 6, sign: -1, lastMove: true },
                ],
                hoshi: [{ col: 4, row: 4 }],
            },
            STATIC_BOARD_THEME_LIGHT
        );

        // 9 board + 1 gutter each side = 11 units
        expect(svg).toContain('viewBox="0 0 11 11"');
        expect(svg).toContain(STATIC_BOARD_THEME_LIGHT.boardBackground);
        expect(svg).toContain(STATIC_BOARD_THEME_LIGHT.gridLine);
        expect(svg).toContain('fill="#09090b"'); // black stone
        expect(svg).toContain('fill="#fafafa"'); // white stone
    });
});

describe("getShareStaticBoardImages", () => {
    it("returns light and dark SVG data URIs", () => {
        const images = getShareStaticBoardImages(baseShare());

        expect(images.columns).toBe(9);
        expect(images.lightSrc.startsWith("data:image/svg+xml,")).toBe(true);
        expect(images.darkSrc.startsWith("data:image/svg+xml,")).toBe(true);
        expect(decodeURIComponent(images.darkSrc)).toContain(
            "#60606a"
        ); // dark board background
    });
});
