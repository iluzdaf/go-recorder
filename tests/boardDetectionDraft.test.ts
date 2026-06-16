import { describe, expect, it } from "vitest";

import type { DetectionResult } from "../lib/boardDetection";
import { isDetectionResult } from "../lib/boardDetection";
import { createBoardDraftInputFromDetection } from "../lib/boardDetectionDraft";

function baseDetection(overrides: Partial<DetectionResult> = {}): DetectionResult {
    return {
        boardSize: 19,
        setupStones: [],
        positionView: null,
        confidence: 1,
        ...overrides,
    };
}

describe("createBoardDraftInputFromDetection", () => {
    it.each([9, 13, 19] as const)(
        "produces a board draft for a %i board",
        (boardSize) => {
            const input = createBoardDraftInputFromDetection(
                baseDetection({
                    boardSize,
                    setupStones: [{ x: 2, y: 2, color: "B" }],
                })
            );

            expect(input.draftKind).toBe("board");
            expect(input.boardSize).toBe(boardSize);
            expect(input.handicap).toBe(0);
            expect(input.blackPlayerName).toBeNull();
            expect(input.whitePlayerName).toBeNull();
            expect(input.gameState.moves).toEqual([]);
            expect(input.gameState.currentPlayer).toBe("B");
            expect(input.gameState.setupStones).toEqual([{ x: 2, y: 2, color: "B" }]);
        }
    );

    it("drops stones outside the board bounds", () => {
        const input = createBoardDraftInputFromDetection(
            baseDetection({
                boardSize: 9,
                setupStones: [
                    { x: 0, y: 0, color: "B" },
                    { x: 9, y: 1, color: "W" },
                    { x: -1, y: 2, color: "B" },
                    { x: 8, y: 8, color: "W" },
                ],
            })
        );

        expect(input.gameState.setupStones).toEqual([
            { x: 0, y: 0, color: "B" },
            { x: 8, y: 8, color: "W" },
        ]);
    });

    it("dedupes stones on the same vertex, keeping the last", () => {
        const input = createBoardDraftInputFromDetection(
            baseDetection({
                setupStones: [
                    { x: 3, y: 3, color: "B" },
                    { x: 3, y: 3, color: "W" },
                ],
            })
        );

        expect(input.gameState.setupStones).toEqual([{ x: 3, y: 3, color: "W" }]);
    });

    it("keeps a valid partial-board position view", () => {
        const input = createBoardDraftInputFromDetection(
            baseDetection({
                boardSize: 9,
                positionView: { anchor: "bottom-right", rows: 8, columns: 8 },
            })
        );

        expect(input.positionView).toEqual({
            anchor: "bottom-right",
            rows: 8,
            columns: 8,
        });
    });

    it("drops an invalid position view", () => {
        const input = createBoardDraftInputFromDetection(
            baseDetection({
                boardSize: 9,
                positionView: {
                    anchor: "bottom-right",
                    rows: 99,
                    columns: 1,
                } as DetectionResult["positionView"],
            })
        );

        expect(input.positionView).toBeNull();
    });
});

describe("isDetectionResult", () => {
    it("accepts a well-formed result", () => {
        expect(isDetectionResult(baseDetection())).toBe(true);
    });

    it("rejects an invalid board size", () => {
        expect(isDetectionResult({ ...baseDetection(), boardSize: 11 })).toBe(false);
    });

    it("rejects malformed stones", () => {
        expect(
            isDetectionResult({
                ...baseDetection(),
                setupStones: [{ x: 0, y: 0, color: "G" }],
            })
        ).toBe(false);
    });

    it("rejects non-object input", () => {
        expect(isDetectionResult(null)).toBe(false);
        expect(isDetectionResult("nope")).toBe(false);
    });
});
