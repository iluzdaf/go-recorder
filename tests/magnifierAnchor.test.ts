import { describe, expect, it } from "vitest";

import { getMagnifierAnchor } from "../lib/magnifierAnchor";

describe("getMagnifierAnchor", () => {
    it("keeps the magnifier on the left when there is no overlap", () => {
        expect(
            getMagnifierAnchor({
                startColumn: 18,
                currentColumn: 18,
                boardSize: 19,
                leftPlacementOverlapsBoard: false,
            })
        ).toBe("left");
    });

    it("moves the magnifier to the right when the current column is in the left band", () => {
        expect(
            getMagnifierAnchor({
                startColumn: 10,
                currentColumn: 7,
                boardSize: 19,
                leftPlacementOverlapsBoard: true,
            })
        ).toBe("right");
    });

    it("moves the magnifier to the left when the current column is in the right band", () => {
        expect(
            getMagnifierAnchor({
                startColumn: 9,
                currentColumn: 12,
                boardSize: 19,
                leftPlacementOverlapsBoard: true,
            })
        ).toBe("left");
    });

    it("uses the start column when the current column is in the middle band", () => {
        expect(
            getMagnifierAnchor({
                startColumn: 0,
                currentColumn: 9,
                boardSize: 19,
                leftPlacementOverlapsBoard: true,
            })
        ).toBe("right");
        expect(
            getMagnifierAnchor({
                startColumn: 18,
                currentColumn: 9,
                boardSize: 19,
                leftPlacementOverlapsBoard: true,
            })
        ).toBe("left");
    });
});
