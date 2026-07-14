import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ShareBoardLoadingShell } from "../components/ShareBoardLoader";
import type { ShareRecord } from "../components/types";

const share: ShareRecord = {
    slug: "test",
    sourceKind: "game",
    boardSize: 19,
    gameState: { setupStones: [], moves: [], currentPlayer: "B" },
    blackPlayerName: null,
    whitePlayerName: null,
    handicap: 0,
    positionView: null,
    createdAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("../components/AppShell", async () => {
    const actual = await vi.importActual<typeof import("../components/AppShell")>(
        "../components/AppShell"
    );

    return {
        ...actual,
        useBoardDisplaySettings: () => ({
            activeBoardThemeClassName: "goban-theme-light",
            darkBoardTheme: "minimalist",
            lightBoardTheme: "minimalist",
            setDarkBoardTheme: vi.fn(),
            setLightBoardTheme: vi.fn(),
            setShowBoardCoordinates: vi.fn(),
            setTwoStepPlacement: vi.fn(),
            showBoardCoordinates: true,
            twoStepPlacement: false,
        }),
        useTheme: () => ({
            isDarkMode: false,
            setIsDarkMode: vi.fn(),
            setThemePreference: vi.fn(),
            themePreference: "light",
        }),
    };
});

describe("ShareBoardLoadingShell", () => {
    it("renders a CSS-themed background layer, a stones image, and no action bar", () => {
        const markup = renderToStaticMarkup(<ShareBoardLoadingShell share={share} />);

        expect(markup).toContain("Loading shared board");
        // Background/grid/star points are one CSS-themed inline SVG (no baked colours).
        expect(markup).toContain("share-static-board-bg");
        expect(markup).toContain("share-static-board-grid");
        // Stones are a single theme-neutral image.
        expect(markup).toContain("data:image/svg+xml,");
        // Coordinate labels are drawn in the with-coordinates variant (CSS
        // selects which variant shows based on the visitor's setting).
        expect(markup).toContain("share-static-board-coord");
        // The disabled action bar was dropped; the live bar arrives with the board.
        expect(markup).not.toContain('aria-label="Share board controls loading"');
        expect(markup).not.toContain("disabled");
    });

    it("renders both coordinate variants so CSS can match the visitor's setting", () => {
        const markup = renderToStaticMarkup(<ShareBoardLoadingShell share={share} />);

        // Both are painted; the pre-paint `board-coords-hidden` class shows one.
        expect(markup).toContain("share-static-board-with-coords");
        expect(markup).toContain("share-static-board-without-coords");
    });

    it("sizes each variant to its own board footprint so no layout shift occurs", () => {
        const markup = renderToStaticMarkup(<ShareBoardLoadingShell share={share} />);

        // With coordinates: 19-line board plus a 2-vertex gutter = 21 per side.
        expect(markup).toContain("(100vw - 4px) / 21");
        expect(markup).toContain("(100dvh - 4px) / 21");
        // Without coordinates: no gutter, so the board fills 19 units per side,
        // matching the live coordinate-less board.
        expect(markup).toContain("(100vw - 4px) / 19");
        expect(markup).toContain("(100dvh - 4px) / 19");
    });
});
