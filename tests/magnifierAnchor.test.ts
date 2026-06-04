import { describe, expect, it } from "vitest";

import { getMagnifierAnchor } from "../lib/magnifierAnchor";

describe("getMagnifierAnchor", () => {
    it("only flips near the top of the board", () => {
        expect(
            getMagnifierAnchor({
                boardX: 0,
                boardY: 0,
                boardSize: 19,
            })
        ).toBe("right");
        expect(
            getMagnifierAnchor({
                boardX: 9,
                boardY: 0,
                boardSize: 19,
            })
        ).toBe("right");
        expect(
            getMagnifierAnchor({
                boardX: 10,
                boardY: 0,
                boardSize: 19,
            })
        ).toBe("left");
        expect(
            getMagnifierAnchor({
                boardX: 18,
                boardY: 18,
                boardSize: 19,
            })
        ).toBe("right");
        expect(
            getMagnifierAnchor({
                boardX: 18,
                boardY: 10,
                boardSize: 19,
            })
        ).toBe("right");
    });
});
