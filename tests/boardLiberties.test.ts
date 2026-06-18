import { describe, expect, it } from "vitest";

import type { SetupStone } from "../components/types";
import {
    getNoLibertyVertices,
    hasNoLibertyGroups,
} from "../lib/boardLiberties";

describe("getNoLibertyVertices", () => {
    it("returns nothing for an empty board", () => {
        expect(
            getNoLibertyVertices({ boardSize: 19, setupStones: [] })
        ).toEqual([]);
    });

    it("returns nothing when every group has liberties", () => {
        const setupStones: SetupStone[] = [
            { x: 3, y: 3, color: "B" },
            { x: 15, y: 15, color: "W" },
        ];

        expect(
            getNoLibertyVertices({ boardSize: 19, setupStones })
        ).toEqual([]);
    });

    it("flags a fully surrounded single stone", () => {
        const setupStones: SetupStone[] = [
            { x: 1, y: 0, color: "W" },
            { x: 0, y: 1, color: "W" },
            { x: 2, y: 1, color: "W" },
            { x: 1, y: 2, color: "W" },
            { x: 1, y: 1, color: "B" },
        ];

        expect(
            getNoLibertyVertices({ boardSize: 19, setupStones })
        ).toEqual([[1, 1]]);
    });

    it("flags a surrounded corner group without duplicating chain vertices", () => {
        const setupStones: SetupStone[] = [
            { x: 0, y: 0, color: "B" },
            { x: 1, y: 0, color: "B" },
            { x: 2, y: 0, color: "W" },
            { x: 0, y: 1, color: "W" },
            { x: 1, y: 1, color: "W" },
        ];

        const result = getNoLibertyVertices({ boardSize: 19, setupStones });

        expect(result).toHaveLength(2);
        expect(result).toEqual(
            expect.arrayContaining([
                [0, 0],
                [1, 0],
            ])
        );
    });
});

describe("hasNoLibertyGroups", () => {
    it("is false when all groups have liberties", () => {
        expect(
            hasNoLibertyGroups({
                boardSize: 19,
                setupStones: [{ x: 3, y: 3, color: "B" }],
            })
        ).toBe(false);
    });

    it("is true when a group has no liberties", () => {
        expect(
            hasNoLibertyGroups({
                boardSize: 9,
                setupStones: [
                    { x: 1, y: 0, color: "W" },
                    { x: 0, y: 1, color: "W" },
                    { x: 2, y: 1, color: "W" },
                    { x: 1, y: 2, color: "W" },
                    { x: 1, y: 1, color: "B" },
                ],
            })
        ).toBe(true);
    });
});
