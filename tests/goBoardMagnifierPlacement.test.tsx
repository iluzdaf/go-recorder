// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type { LocalGameRecord } from "../components/types";

(globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const mockGetLocalGame = vi.hoisted(() => vi.fn());
const mockUseTheme = vi.hoisted(() => vi.fn(() => ({ isDarkMode: false })));

vi.mock("next/link", () => ({
    default: ({ children, ...props }: { children?: ReactNode }) => (
        <a {...props}>{children}</a>
    ),
}));

vi.mock("next/image", () => ({
    default: () => null,
}));

vi.mock("@sabaki/shudan", () => ({
    Goban: ({ vertexSize }: { vertexSize: number }) => (
        <svg
            className="shudan-grid"
            data-testid="mock-board-grid"
            width={vertexSize * 19}
            height={vertexSize * 19}
        />
    ),
}));

vi.mock("../components/AppShell", () => ({
    useTheme: mockUseTheme,
}));

vi.mock("../components/BoardStatusMessage", () => ({
    default: () => null,
}));

vi.mock("../lib/localGames", () => ({
    getLocalGame: mockGetLocalGame,
    saveLocalGame: vi.fn((record) => record),
}));

import GoBoard from "../components/GoBoard";

type Rect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
};

const IPHONE_VIEWPORT = {
    width: 393,
    height: 852,
};

const BOARD_AREA_RECT: Rect = {
    left: 0,
    top: 0,
    width: IPHONE_VIEWPORT.width,
    height: IPHONE_VIEWPORT.height,
    right: IPHONE_VIEWPORT.width,
    bottom: IPHONE_VIEWPORT.height,
};

const BOARD_GRID_SIZE = 342;
const BOARD_GRID_RECT: Rect = {
    left: (IPHONE_VIEWPORT.width - BOARD_GRID_SIZE) / 2,
    top: (IPHONE_VIEWPORT.height - BOARD_GRID_SIZE) / 2,
    width: BOARD_GRID_SIZE,
    height: BOARD_GRID_SIZE,
    right: (IPHONE_VIEWPORT.width - BOARD_GRID_SIZE) / 2 + BOARD_GRID_SIZE,
    bottom: (IPHONE_VIEWPORT.height - BOARD_GRID_SIZE) / 2 + BOARD_GRID_SIZE,
};

const BOARD_WRAPPER_RECT: Rect = BOARD_AREA_RECT;
const BOARD_RECT: Rect = {
    left: BOARD_GRID_RECT.left,
    top: BOARD_GRID_RECT.top,
    width: BOARD_GRID_RECT.width,
    height: BOARD_GRID_RECT.height,
    right: BOARD_GRID_RECT.right,
    bottom: BOARD_GRID_RECT.bottom,
};

const EMPTY_GAME_STATE = {
    setupStones: [],
    moves: [],
    currentPlayer: "B" as const,
};

const LOCAL_GAME_RECORD: LocalGameRecord = {
    id: "iphone-game",
    boardSize: 19,
    gameState: EMPTY_GAME_STATE,
    blackPlayerName: null,
    whitePlayerName: null,
    handicap: 0,
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
};

function createStorageMock() {
    const items = new Map<string, string>();

    return {
        clear: vi.fn(() => {
            items.clear();
        }),
        getItem: vi.fn((key: string) => items.get(key) ?? null),
        key: vi.fn((index: number) => Array.from(items.keys())[index] ?? null),
        removeItem: vi.fn((key: string) => {
            items.delete(key);
        }),
        setItem: vi.fn((key: string, value: string) => {
            items.set(key, value);
        }),
        get length() {
            return items.size;
        },
    };
}

function createRect(rect: Rect) {
    return {
        x: rect.left,
        y: rect.top,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        toJSON() {
            return this;
        },
    } as DOMRect;
}

function rectanglesOverlap(a: Rect, b: Rect) {
    return (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
    );
}

function installGeometryMocks() {
    return vi
        .spyOn(Element.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: Element) {
            const className =
                typeof (this as HTMLElement).className === "string"
                    ? ((this as HTMLElement).className as string)
                    : "";

            if (
                className.includes("flex-1") &&
                className.includes("items-center") &&
                className.includes("justify-center")
            ) {
                return createRect(BOARD_AREA_RECT);
            }

            if (
                className === "relative" &&
                this.parentElement &&
                typeof (this.parentElement as HTMLElement).className === "string" &&
                (this.parentElement as HTMLElement).className.includes("flex-1") &&
                (this.parentElement as HTMLElement).className.includes("justify-center")
            ) {
                return createRect(BOARD_WRAPPER_RECT);
            }

            if (this instanceof SVGElement && this.classList.contains("shudan-grid")) {
                return createRect(BOARD_GRID_RECT);
            }

            return createRect({
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                width: 0,
                height: 0,
            });
        });
}

function createRootContainer() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    return createRoot(container);
}

function dispatchPointerDown(target: Element, clientX: number, clientY: number) {
    const event = new MouseEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        buttons: 1,
    }) as MouseEvent & { pointerId: number };

    Object.defineProperty(event, "pointerId", {
        configurable: true,
        value: 1,
    });

    act(() => {
        target.dispatchEvent(event);
    });
}

function renderGoBoard() {
    const root = createRootContainer();

    act(() => {
        root.render(<GoBoard id="iphone-game" />);
    });

    return root;
}

function cleanupRoot(root: Root) {
    act(() => {
        root.unmount();
    });
    document.body.innerHTML = "";
}

describe("GoBoard magnifier placement", () => {
    beforeEach(() => {
        mockGetLocalGame.mockReturnValue(LOCAL_GAME_RECORD);

        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: createStorageMock(),
        });

        Object.defineProperty(window, "innerWidth", {
            configurable: true,
            value: IPHONE_VIEWPORT.width,
            writable: true,
        });

        Object.defineProperty(window, "innerHeight", {
            configurable: true,
            value: IPHONE_VIEWPORT.height,
            writable: true,
        });

        Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
            configurable: true,
            value: vi.fn(),
        });
        Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
            configurable: true,
            value: vi.fn(),
        });
        Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
            configurable: true,
            value: vi.fn(() => false),
        });

        if (!("ResizeObserver" in globalThis)) {
            class MockResizeObserver {
                observe() {}
                unobserve() {}
                disconnect() {}
            }

            vi.stubGlobal("ResizeObserver", MockResizeObserver);
        }
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    it.each([
        ["B2", 1, 17],
        ["T18", 18, 1],
    ])(
        "keeps the magnifier on the left and away from the board on iPhone-sized viewports for %s",
        async (_label, boardX, boardY) => {
            const geometrySpy = installGeometryMocks();
            const root = renderGoBoard();

            const grid = document.querySelector(
                '[data-testid="mock-board-grid"]'
            ) as SVGElement | null;

            expect(grid).not.toBeNull();

            const cellSize = BOARD_GRID_RECT.width / 19;
            const clientX = BOARD_GRID_RECT.left + (boardX + 0.5) * cellSize;
            const clientY = BOARD_GRID_RECT.top + (boardY + 0.5) * cellSize;

            dispatchPointerDown(grid as Element, clientX, clientY);

            const magnifier = document.querySelector(
                '[data-testid="magnifier"]'
            ) as HTMLElement | null;

            expect(magnifier).not.toBeNull();
            expect(magnifier?.style.left).toBe("8px");
            expect(magnifier?.style.top).toBe("72px");

            const magnifierRect: Rect = {
                left: Number.parseFloat(magnifier?.style.left ?? "NaN"),
                top: Number.parseFloat(magnifier?.style.top ?? "NaN"),
                width: 160,
                height: 160,
                right: Number.parseFloat(magnifier?.style.left ?? "NaN") + 160,
                bottom: Number.parseFloat(magnifier?.style.top ?? "NaN") + 160,
            };

            expect(rectanglesOverlap(BOARD_RECT, magnifierRect)).toBe(false);
            expect(rectanglesOverlap(BOARD_AREA_RECT, magnifierRect)).toBe(true);

            cleanupRoot(root);
            geometrySpy.mockRestore();
        }
    );
});
