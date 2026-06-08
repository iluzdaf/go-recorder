import { describe, expect, it } from "vitest";

import { buildBoardFromGameState } from "../lib/shareBoardState";

describe("buildBoardFromGameState", () => {
    it("preserves setup stone colors", () => {
        const board = buildBoardFromGameState(
            9,
            [
                { x: 2, y: 2, color: "B" },
                { x: 6, y: 6, color: "W" },
            ],
            []
        );

        expect(board.signMap[2][2]).toBe(1);
        expect(board.signMap[6][6]).toBe(-1);
    });
});
