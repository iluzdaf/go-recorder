import { describe, expect, it } from "vitest";

import {
    createDefaultBoardGridMetrics,
    getBoardVertexSize,
} from "../lib/boardGeometry";

describe("board geometry helpers", () => {
    it("sizes vertices from the smaller available board dimension", () => {
        expect(
            getBoardVertexSize({ boardSize: 19, width: 520, height: 420 })
        ).toBe(20);
    });

    it("keeps a minimum touch-friendly vertex size", () => {
        expect(
            getBoardVertexSize({ boardSize: 19, width: 120, height: 120 })
        ).toBe(16);
    });

    it("accounts for board size when sizing vertices", () => {
        expect(
            getBoardVertexSize({ boardSize: 9, width: 320, height: 320 })
        ).toBe(30);
    });

    it("creates default grid metrics from board size and vertex size", () => {
        expect(createDefaultBoardGridMetrics(13, 18)).toEqual({
            left: 0,
            top: 0,
            cellSize: 18,
            boardSizePx: 234,
        });
    });
});
