// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type { LocalGameRecord } from "../components/types";
import { MAGNIFIER_SIZE_PX } from "../lib/magnifier";

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

const BOARD_WIDTH = 342;
const BOARD_LEFT = (IPHONE_VIEWPORT.width - BOARD_WIDTH) / 2;

const EMPTY_GAME_STATE = {
    setupStones: [],
    moves: [],
    currentPlayer: "B" as const,
};

const LOCAL_GAME_RECORD: LocalGameRecord = {
    id: "interaction-game",
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

function createGeometryMock(gridTop: number) {
    const boardAreaRect: Rect = {
        left: 0,
        top: 0,
        width: IPHONE_VIEWPORT.width,
        height: IPHONE_VIEWPORT.height,
        right: IPHONE_VIEWPORT.width,
        bottom: IPHONE_VIEWPORT.height,
    };
    const gridRect: Rect = {
        left: BOARD_LEFT,
        top: gridTop,
        width: BOARD_WIDTH,
        height: BOARD_WIDTH,
        right: BOARD_LEFT + BOARD_WIDTH,
        bottom: gridTop + BOARD_WIDTH,
    };
    const wrapperRect: Rect = {
        left: 0,
        top: 0,
        width: BOARD_WIDTH,
        height: BOARD_WIDTH,
        right: BOARD_WIDTH,
        bottom: BOARD_WIDTH,
    };

    const spy = vi
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
                return createRect(boardAreaRect);
            }

            if (className === "relative") {
                return createRect(wrapperRect);
            }

            if (this instanceof SVGElement && this.classList.contains("shudan-grid")) {
                return createRect(gridRect);
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

    return {
        spy,
        boardRect: {
            left: gridRect.left,
            top: gridRect.top,
            right: gridRect.right,
            bottom: gridRect.bottom,
            width: gridRect.width,
            height: gridRect.height,
        } satisfies Rect,
    };
}

function createPointerEvent(
    type: "pointerdown" | "pointermove",
    clientX: number,
    clientY: number
) {
    const event = new MouseEvent(type, {
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

    return event;
}

async function renderGoBoard(gridTop: number) {
    const geometry = createGeometryMock(gridTop);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
        root.render(<GoBoard id="interaction-game" />);
    });

    const grid = document.querySelector(
        '[data-testid="mock-board-grid"]'
    ) as SVGElement | null;

    expect(grid).not.toBeNull();

    return {
        root,
        container,
        grid: grid as SVGElement,
        geometry,
    };
}

function cleanupRoot(root: Root, container: HTMLElement) {
    act(() => {
        root.unmount();
    });
    container.remove();
}

function getMagnifierRect() {
    const magnifier = document.querySelector(
        '[data-testid="magnifier"]'
    ) as HTMLElement | null;

    expect(magnifier).not.toBeNull();

    const left = Number.parseFloat(magnifier?.style.left ?? "NaN");
    const top = Number.parseFloat(magnifier?.style.top ?? "NaN");

    return {
        left,
        top,
        right: left + MAGNIFIER_SIZE_PX,
        bottom: top + MAGNIFIER_SIZE_PX,
        width: MAGNIFIER_SIZE_PX,
        height: MAGNIFIER_SIZE_PX,
        element: magnifier as HTMLElement,
    } satisfies Rect & { element: HTMLElement };
}

function boardCellToClient(gridTop: number, x: number, y: number) {
    const cellSize = BOARD_WIDTH / 19;

    return {
        clientX: BOARD_LEFT + (x + 0.5) * cellSize,
        clientY: gridTop + (y + 0.5) * cellSize,
    };
}

describe("GoBoard magnifier interactions", () => {
    beforeEach(() => {
        mockGetLocalGame.mockReturnValue(LOCAL_GAME_RECORD);
        mockUseTheme.mockReturnValue({ isDarkMode: false });

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

        class MockResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        }

        vi.stubGlobal("ResizeObserver", MockResizeObserver);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    it("stays on the left during board interaction when there is no overlap on iPhone", async () => {
        const gridTop = 260;
        const { root, container, grid, geometry } = await renderGoBoard(gridTop);

        const start = boardCellToClient(gridTop, 1, 17);
        await act(async () => {
            grid.dispatchEvent(createPointerEvent("pointerdown", start.clientX, start.clientY));
        });

        const afterDown = getMagnifierRect();
        expect(afterDown.left).toBe(8);

        const drag = boardCellToClient(gridTop, 18, 17);
        await act(async () => {
            grid.dispatchEvent(createPointerEvent("pointermove", drag.clientX, drag.clientY));
        });

        const afterMove = getMagnifierRect();
        expect(afterMove.left).toBe(8);
        expect(rectanglesOverlap(geometry.boardRect, afterMove)).toBe(false);

        cleanupRoot(root, container);
    });

    it("moves to the right when the board overlaps and the interaction starts on the left", async () => {
        const gridTop = 100;
        const { root, container, grid } = await renderGoBoard(gridTop);

        const start = boardCellToClient(gridTop, 1, 1);
        await act(async () => {
            grid.dispatchEvent(createPointerEvent("pointerdown", start.clientX, start.clientY));
        });

        const magnifier = getMagnifierRect();
        expect(magnifier.left).toBe(IPHONE_VIEWPORT.width - MAGNIFIER_SIZE_PX - 8);

        cleanupRoot(root, container);
    });

    it("moves back to the left when the board overlaps and the drag ends on the right band", async () => {
        const gridTop = 100;
        const { root, container, grid } = await renderGoBoard(gridTop);

        const start = boardCellToClient(gridTop, 1, 1);
        await act(async () => {
            grid.dispatchEvent(createPointerEvent("pointerdown", start.clientX, start.clientY));
        });

        const rightBand = boardCellToClient(gridTop, 18, 1);
        await act(async () => {
            grid.dispatchEvent(createPointerEvent("pointermove", rightBand.clientX, rightBand.clientY));
        });

        const magnifier = getMagnifierRect();
        expect(magnifier.left).toBe(8);

        cleanupRoot(root, container);
    });
});
