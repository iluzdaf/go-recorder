import { describe, expect, it } from "vitest";

import {
    getChangelogDialogClassName,
    getSettingsDialogClassName,
    resolveShowBoardCoordinatesPreference,
    shouldAnchorHeaderDialogsToViewportTop,
    shouldUseOverlayHeader,
} from "../components/AppShell";

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

describe("resolveShowBoardCoordinatesPreference", () => {
    it("defaults to showing coordinates", () => {
        expect(resolveShowBoardCoordinatesPreference(null)).toBe(true);
    });

    it("only hides coordinates when the stored preference is false", () => {
        expect(resolveShowBoardCoordinatesPreference("false")).toBe(false);
        expect(resolveShowBoardCoordinatesPreference("true")).toBe(true);
        expect(resolveShowBoardCoordinatesPreference("unexpected")).toBe(true);
    });
});

describe("header dialog placement", () => {
    it("only uses viewport-top anchoring when the overlay header is hidden", () => {
        expect(
            shouldAnchorHeaderDialogsToViewportTop({
                isHeaderVisible: false,
                usesOverlayHeader: true,
            })
        ).toBe(true);
        expect(
            shouldAnchorHeaderDialogsToViewportTop({
                isHeaderVisible: true,
                usesOverlayHeader: true,
            })
        ).toBe(false);
        expect(
            shouldAnchorHeaderDialogsToViewportTop({
                isHeaderVisible: true,
                usesOverlayHeader: false,
            })
        ).toBe(false);
    });

    it("anchors changelog and settings below the regular header by default", () => {
        expect(
            getChangelogDialogClassName({ alignToViewportTop: false })
        ).toContain("fixed right-4 top-16");
        expect(
            getSettingsDialogClassName({ alignToViewportTop: false })
        ).toContain("fixed right-4 top-16");
    });

    it("anchors changelog and settings to the viewport top when the overlay header is hidden", () => {
        expect(
            getChangelogDialogClassName({ alignToViewportTop: true })
        ).toContain("absolute right-4 top-4");
        expect(
            getSettingsDialogClassName({ alignToViewportTop: true })
        ).toContain("absolute right-4 top-4");
    });
});
