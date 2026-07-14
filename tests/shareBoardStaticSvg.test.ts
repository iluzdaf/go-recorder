import { describe, expect, it } from "vitest";

import type { FinalPosition, ShareRecord } from "../components/types";
import {
    getShareStaticBoard,
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

describe("getShareStaticBoard", () => {
    it("emits a gutter-inclusive grid and a theme-neutral stones image", () => {
        const finalPosition = emptyBoard(9);
        finalPosition[2][2] = 1; // black
        finalPosition[6][6] = -1; // white

        const board = getShareStaticBoard(
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
            }),
            { showCoordinates: true }
        );

        // 9 board + 1 gutter each side = 11 units
        expect(board.width).toBe(11);
        expect(board.height).toBe(11);
        // Grid path draws a line for each of the 9 columns and 9 rows.
        expect(board.gridPath.match(/M/g)).toHaveLength(18);
        expect(board.hoshi).toContainEqual({ cx: 5.5, cy: 5.5 });

        // Stones live in a single theme-neutral data-URI image (no board colours).
        expect(board.stonesSrc.startsWith("data:image/svg+xml,")).toBe(true);
        const stonesSvg = decodeURIComponent(board.stonesSrc);
        expect(stonesSvg).toContain('viewBox="0 0 11 11"');
        expect(stonesSvg).toContain('fill="#09090b"'); // black stone
        expect(stonesSvg).toContain('fill="#fafafa"'); // white stone
        expect(stonesSvg).not.toContain("#f4f4f5"); // no board background baked in
    });

    it("labels coordinates with Shudan's convention (letters skip I, rows N..1)", () => {
        const board = getShareStaticBoard(baseShare(), {
            showCoordinates: true,
        }); // full 9x9

        const labels = board.coordinates.map((c) => c.text);
        // Two labels per column and per row = 2 * (9 + 9).
        expect(board.coordinates).toHaveLength(36);
        expect(labels).toContain("A");
        expect(labels).toContain("J"); // 9th column skips "I"
        expect(labels).not.toContain("I");
        expect(labels).toContain("9"); // top row
        expect(labels).toContain("1"); // bottom row
    });

    it("offsets coordinate labels to true board positions under a position view", () => {
        const board = getShareStaticBoard(
            baseShare({
                sourceKind: "draft",
                draftKind: "board",
                positionView: { anchor: "top-left", rows: 3, columns: 3 },
            }),
            { showCoordinates: true }
        );

        const labels = board.coordinates.map((c) => c.text);
        // top-left 3x3 of a 9x9: columns A,B,C and rows 9,8,7.
        expect(labels).toEqual(
            expect.arrayContaining(["A", "B", "C", "9", "8", "7"])
        );
        expect(labels).not.toContain("D");
    });

    it("drops the gutter and coordinates when coordinates are hidden", () => {
        const finalPosition = emptyBoard(9);
        finalPosition[2][2] = 1; // black

        const board = getShareStaticBoard(
            baseShare({
                finalPosition,
                gameState: {
                    setupStones: [],
                    moves: [{ type: "play", x: 2, y: 2, color: "B" }],
                    currentPlayer: "B",
                },
            }),
            { showCoordinates: false }
        );

        // No gutter: the viewBox is exactly the board, matching the live
        // coordinate-less board so the swap does not resize.
        expect(board.width).toBe(9);
        expect(board.height).toBe(9);
        expect(board.coordinates).toHaveLength(0);
        // Grid still draws a line per column and row; hoshi shift in by the
        // dropped gutter (centre of vertex 4 is now 4.5).
        expect(board.gridPath.match(/M/g)).toHaveLength(18);
        expect(board.hoshi).toContainEqual({ cx: 4.5, cy: 4.5 });
        expect(decodeURIComponent(board.stonesSrc)).toContain(
            'viewBox="0 0 9 9"'
        );
    });
});
