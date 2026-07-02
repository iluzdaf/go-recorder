import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ShareBoardLoadingShell } from "../components/ShareBoardLoader";

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
    it("keeps stable share chrome and disables board controls while loading", () => {
        const markup = renderToStaticMarkup(<ShareBoardLoadingShell />);

        expect(markup).toContain("Loading shared board");
        expect(markup).toContain('aria-label="Share board controls loading"');
        expect(markup).toContain('aria-label="Go to start"');
        expect(markup).toContain('aria-label="Previous move"');
        expect(markup).toContain('aria-label="Next move"');
        expect(markup).toContain('aria-label="Go to end"');
        expect(markup.match(/disabled=""/g)).toHaveLength(5);
    });
});
