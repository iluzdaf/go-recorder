import { describe, expect, it } from "vitest";

import {
    getAppNavigationTargets,
    getChangelogDialogClassName,
    getSettingsDialogClassName,
    resolveShowBoardCoordinatesPreference,
    shouldAnchorHeaderDialogsToViewportTop,
    shouldUseOverlayHeader,
    updateAppNavigationStateForPath,
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

    it("allows a back target to home from a non-home route", () => {
        expect(
            getAppNavigationTargets({
                entries: ["/", "/games/game123"],
                index: 1,
            })
        ).toEqual({
            backPath: "/",
        });
    });

    it("returns only useful non-home back targets", () => {
        expect(
            getAppNavigationTargets({
                entries: [
                    "/",
                    "/games/game123",
                    "/shares/share123",
                    "/drafts/draft123",
                ],
                index: 2,
            })
        ).toEqual({
            backPath: "/games/game123",
        });
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

describe("app navigation state", () => {
    it("starts a stack from the first app path", () => {
        expect(
            updateAppNavigationStateForPath({
                pathname: "/games/game123",
                state: { entries: [], index: -1 },
            })
        ).toEqual({
            entries: ["/games/game123"],
            index: 0,
        });
    });

    it("appends new paths and leaves the current path unchanged", () => {
        const state = updateAppNavigationStateForPath({
            pathname: "/shares/share123",
            state: { entries: ["/games/game123"], index: 0 },
        });

        expect(state).toEqual({
            entries: ["/games/game123", "/shares/share123"],
            index: 1,
        });
        expect(
            updateAppNavigationStateForPath({
                pathname: "/shares/share123",
                state,
            })
        ).toEqual(state);
    });

    it("drops forward entries when navigating from the middle of the stack", () => {
        expect(
            updateAppNavigationStateForPath({
                pathname: "/drafts/draft123",
                state: {
                    entries: [
                        "/games/game123",
                        "/shares/share123",
                        "/drafts/old-draft",
                    ],
                    index: 1,
                },
            })
        ).toEqual({
            entries: [
                "/games/game123",
                "/shares/share123",
                "/drafts/draft123",
            ],
            index: 2,
        });
    });

    it("moves to an existing path instead of duplicating it", () => {
        expect(
            updateAppNavigationStateForPath({
                pathname: "/shares/share123",
                state: {
                    entries: [
                        "/games/game123",
                        "/shares/share123",
                        "/drafts/draft123",
                    ],
                    index: 2,
                },
            })
        ).toEqual({
            entries: [
                "/games/game123",
                "/shares/share123",
                "/drafts/draft123",
            ],
            index: 1,
        });
    });

    it("resets the app navigation stack when reaching home", () => {
        expect(
            updateAppNavigationStateForPath({
                pathname: "/",
                state: {
                    entries: [
                        "/",
                        "/drafts/draft123",
                        "/shares/share123",
                    ],
                    index: 2,
                },
            })
        ).toEqual({
            entries: ["/"],
            index: 0,
        });
    });
});
