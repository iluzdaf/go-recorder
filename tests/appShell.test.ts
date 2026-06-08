import { describe, expect, it } from "vitest";

import { shouldUseOverlayHeader } from "../components/AppShell";

describe("shouldUseOverlayHeader", () => {
    it.each(["/games/game123", "/drafts/draft123", "/shares/share123"])(
        "uses the compact overlay header for %s in short viewports",
        (pathname) => {
            expect(
                shouldUseOverlayHeader({
                    isShortViewport: true,
                    pathname,
                })
            ).toBe(true);
        }
    );

    it("keeps the regular header outside constrained viewports", () => {
        expect(
            shouldUseOverlayHeader({
                isShortViewport: false,
                pathname: "/drafts/draft123",
            })
        ).toBe(false);
    });

    it("keeps the regular header on non-board routes", () => {
        expect(
            shouldUseOverlayHeader({
                isShortViewport: true,
                pathname: "/",
            })
        ).toBe(false);
    });
});
