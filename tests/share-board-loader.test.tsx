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
    it("renders all four board theme variants and no action bar", () => {
        const markup = renderToStaticMarkup(<ShareBoardLoadingShell share={share} />);

        expect(markup).toContain("Loading shared board");
        for (const key of [
            "light-minimalist",
            "light-wood",
            "dark-minimalist",
            "dark-wood",
        ]) {
            expect(markup).toContain(`share-static-board-img--${key}`);
        }
        // The disabled action bar was dropped; the live bar arrives with the board.
        expect(markup).not.toContain('aria-label="Share board controls loading"');
        expect(markup).not.toContain("disabled");
    });

    it("sizes the placeholder to the board footprint so no layout shift occurs", () => {
        const markup = renderToStaticMarkup(<ShareBoardLoadingShell share={share} />);

        // 19-line board plus a 2-vertex coordinate gutter = 21 units per side.
        expect(markup).toContain("(100vw - 4px) / 21");
        expect(markup).toContain("(100dvh - 4px) / 21");
    });
});
