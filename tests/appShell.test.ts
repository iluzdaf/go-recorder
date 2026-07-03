import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
    getBoardThemeClassName,
    getBoardSurfaceClassName,
    getAppNavigationTargets,
    getChangelogDialogClassName,
    getNextThemePreference,
    getSettingsDialogClassName,
    resolveBoardThemePreference,
    resolveShowBoardCoordinatesPreference,
    resolveTwoStepPlacementPreference,
    shouldOpenSettingsDialogFromPath,
    shouldAnchorHeaderDialogsToViewportTop,
    updateAppNavigationStateForPath,
} from "../components/AppShell";
import SettingsControls from "../components/SettingsControls";

describe("app navigation targets", () => {
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

describe("resolveTwoStepPlacementPreference", () => {
    it("defaults to off", () => {
        expect(resolveTwoStepPlacementPreference(null)).toBe(false);
    });

    it("enables only when stored preference is true", () => {
        expect(resolveTwoStepPlacementPreference("true")).toBe(true);
        expect(resolveTwoStepPlacementPreference("false")).toBe(false);
        expect(resolveTwoStepPlacementPreference("unexpected")).toBe(false);
    });
});

describe("appearance preferences", () => {
    it("cycles through light, dark, and follow-system modes", () => {
        expect(getNextThemePreference("light")).toBe("dark");
        expect(getNextThemePreference("dark")).toBe("system");
        expect(getNextThemePreference("system")).toBe("light");
    });

    it("renders stable Appearance copy with Auto, Light, and Dark choices", () => {
        const markup = renderToStaticMarkup(
            createElement(SettingsControls, {
                darkBoardTheme: "minimalist",
                isDarkMode: false,
                isFullscreen: false,
                isFullscreenSupported: false,
                lightBoardTheme: "minimalist",
                onDarkBoardThemeChange: () => undefined,
                onLightBoardThemeChange: () => undefined,
                onShowBoardCoordinatesChange: () => undefined,
                onThemePreferenceChange: () => undefined,
                onToggleFullscreen: () => undefined,
                onTwoStepPlacementChange: () => undefined,
                defaultOpenSection: "app",
                showBoardCoordinates: true,
                showBoardThemes: false,
                showLocalData: false,
                themePreference: "system",
                twoStepPlacement: false,
            })
        );

        expect(markup).toContain("Appearance");
        expect(markup).toContain("Auto");
        expect(markup).toContain("Light");
        expect(markup).toContain("Dark");
        expect(markup).toContain('aria-label="Appearance: Auto"');
        expect(markup).toContain('aria-pressed="true"');
        expect(markup).toContain("grid w-full grid-cols-[repeat(var(--segment-count),minmax(0,1fr))]");
        expect(markup).not.toContain("<select");
        expect(markup).not.toContain("Follow system");
        expect(markup).not.toContain("Light mode");
        expect(markup).not.toContain("Dark mode");
    });
});

describe("compact settings controls", () => {
    it("omits board themes and local data when rendering the compact surface", () => {
        const markup = renderToStaticMarkup(
            createElement(SettingsControls, {
                darkBoardTheme: "wood",
                isDarkMode: false,
                isFullscreen: false,
                isFullscreenSupported: false,
                lightBoardTheme: "wood",
                onDarkBoardThemeChange: () => undefined,
                onLightBoardThemeChange: () => undefined,
                onShowBoardCoordinatesChange: () => undefined,
                onThemePreferenceChange: () => undefined,
                onToggleFullscreen: () => undefined,
                onTwoStepPlacementChange: () => undefined,
                defaultOpenSection: "board",
                showBoardCoordinates: true,
                showBoardThemes: false,
                showLocalData: false,
                themePreference: "light",
                twoStepPlacement: true,
            })
        );

        expect(markup).toContain("Show board coordinates");
        expect(markup).toContain("Two-step placement");
        expect(markup).toContain("App");
        expect(markup).not.toContain("Light board theme");
        expect(markup).not.toContain("Dark board theme");
        expect(markup).not.toContain("Export local data");
        expect(markup).not.toContain("Import local data");
    });

    it("renders App above Board while keeping only App open by default", () => {
        const markup = renderToStaticMarkup(
            createElement(SettingsControls, {
                darkBoardTheme: "wood",
                isDarkMode: false,
                isFullscreen: false,
                isFullscreenSupported: false,
                lightBoardTheme: "minimalist",
                onDarkBoardThemeChange: () => undefined,
                onLightBoardThemeChange: () => undefined,
                onShowBoardCoordinatesChange: () => undefined,
                onThemePreferenceChange: () => undefined,
                onToggleFullscreen: () => undefined,
                onTwoStepPlacementChange: () => undefined,
                showBoardCoordinates: true,
                showBoardThemes: true,
                showLocalData: true,
                themePreference: "system",
                twoStepPlacement: false,
            })
        );

        expect(markup.match(/aria-expanded="true"/g)?.length).toBe(1);
        expect(markup).toContain('aria-expanded="false"');
        expect(markup.indexOf("App")).toBeLessThan(markup.indexOf("Board"));
        expect(markup).not.toContain("Light board theme");
        expect(markup).not.toContain("Dark board theme");
        expect(markup).toContain("Appearance");
        expect(markup).toContain("Export local data");
    });

    it("can render the full settings page with all sections open by default", () => {
        const markup = renderToStaticMarkup(
            createElement(SettingsControls, {
                darkBoardTheme: "wood",
                isDarkMode: false,
                isFullscreen: false,
                isFullscreenSupported: false,
                lightBoardTheme: "minimalist",
                onDarkBoardThemeChange: () => undefined,
                onLightBoardThemeChange: () => undefined,
                onShowBoardCoordinatesChange: () => undefined,
                onThemePreferenceChange: () => undefined,
                onToggleFullscreen: () => undefined,
                onTwoStepPlacementChange: () => undefined,
                defaultOpenSections: ["app", "board"],
                openMultipleSections: true,
                showBoardCoordinates: true,
                showBoardThemes: true,
                showLocalData: true,
                themePreference: "system",
                twoStepPlacement: false,
            })
        );

        expect(markup.match(/aria-expanded="true"/g)?.length).toBe(2);
        expect(markup.indexOf("App")).toBeLessThan(markup.indexOf("Board"));
        expect(markup).toContain("Export local data");
        expect(markup).toContain("Light board theme");
    });
});

describe("settings route dialog behavior", () => {
    it("does not open the header settings dialog from the settings page", () => {
        expect(shouldOpenSettingsDialogFromPath("/settings")).toBe(false);
        expect(shouldOpenSettingsDialogFromPath("/games/game123")).toBe(true);
        expect(shouldOpenSettingsDialogFromPath(null)).toBe(true);
    });
});

describe("board theme preferences", () => {
    it("defaults to the minimalist board theme", () => {
        expect(resolveBoardThemePreference(null)).toBe("minimalist");
        expect(resolveBoardThemePreference("unexpected")).toBe("minimalist");
    });

    it("accepts persisted minimalist and wood theme values", () => {
        expect(resolveBoardThemePreference("minimalist")).toBe("minimalist");
        expect(resolveBoardThemePreference("wood")).toBe("wood");
    });

    it("resolves active board theme classes by app mode", () => {
        expect(
            getBoardThemeClassName({
                boardTheme: "minimalist",
                isDarkMode: false,
            })
        ).toBe("goban-theme-light");
        expect(
            getBoardThemeClassName({
                boardTheme: "minimalist",
                isDarkMode: true,
            })
        ).toBe("goban-theme-dark");
        expect(
            getBoardThemeClassName({
                boardTheme: "wood",
                isDarkMode: false,
            })
        ).toBe("goban-theme-wood-light");
        expect(
            getBoardThemeClassName({
                boardTheme: "wood",
                isDarkMode: true,
            })
        ).toBe("goban-theme-wood-dark");
    });

    it("builds shared board surface classes for recorder, draft, and share boards", () => {
        expect(
            getBoardSurfaceClassName({
                activeBoardThemeClassName: "goban-theme-wood-dark",
                isDarkMode: true,
            })
        ).toContain("goban-theme-wood-dark");
        expect(
            getBoardSurfaceClassName({
                activeBoardThemeClassName: "goban-theme-wood-dark",
                isDarkMode: true,
            })
        ).toContain("bg-neutral-900 text-white");
        expect(
            getBoardSurfaceClassName({
                activeBoardThemeClassName: "goban-theme-wood-light",
                extraClassName: "draft-board",
                isDarkMode: false,
            })
        ).toMatch(/^draft-board goban-theme-wood-light /);
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
