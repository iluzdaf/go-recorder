import { describe, expect, it } from "vitest";

import { shouldRevealDeleteAction } from "../components/SwipeDeleteRow";

describe("shouldRevealDeleteAction", () => {
    it("reveals delete only after a leftward drag crosses the threshold", () => {
        expect(shouldRevealDeleteAction(-27)).toBe(false);
        expect(shouldRevealDeleteAction(-28)).toBe(true);
        expect(shouldRevealDeleteAction(36)).toBe(false);
    });
});
