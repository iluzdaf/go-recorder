import { describe, expect, it } from "vitest";

import {
    createDefaultBoardGridMetrics,
    getLiveBoardGridMetrics,
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

    it("measures live Shudan grid metrics from the wrapper and grid bounds", () => {
        const grid = {
            getBoundingClientRect: () => ({
                left: 48,
                top: 72,
                width: 380,
            }),
        } as Element;
        const wrapper = {
            getBoundingClientRect: () => ({
                left: 20,
                top: 30,
            }),
            querySelector: (selector: string) =>
                selector === ".shudan-grid" ? grid : null,
        } as Element;

        expect(
            getLiveBoardGridMetrics({
                boardSize: 19,
                gobanWrapper: wrapper,
            })
        ).toEqual({
            gridGeometry: {
                left: 48,
                top: 72,
                cellSize: 20,
                boardSize: 19,
            },
            gridMetrics: {
                left: 28,
                top: 42,
                cellSize: 20,
                boardSizePx: 380,
            },
        });
    });

    it("returns null when the Shudan grid is unavailable", () => {
        const wrapper = {
            querySelector: () => null,
        } as unknown as Element;

        expect(
            getLiveBoardGridMetrics({
                boardSize: 19,
                gobanWrapper: wrapper,
            })
        ).toBeNull();
    });
});
