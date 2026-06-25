import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadHomeSetup, saveHomeSetup } from "../lib/homeSetup";

function createStorageMock() {
    const items = new Map<string, string>();

    return {
        clear: vi.fn(() => { items.clear(); }),
        getItem: vi.fn((key: string) => items.get(key) ?? null),
        key: vi.fn((index: number) => Array.from(items.keys())[index] ?? null),
        removeItem: vi.fn((key: string) => { items.delete(key); }),
        setItem: vi.fn((key: string, value: string) => { items.set(key, value); }),
        get length() { return items.size; },
    };
}

const DEFAULTS = {
    boardSize: 19,
    handicap: 0,
    draftSource: "blank",
};

describe("loadHomeSetup", () => {
    beforeEach(() => {
        vi.stubGlobal("window", { localStorage: createStorageMock() });
    });

    it("returns defaults when nothing is saved", () => {
        expect(loadHomeSetup()).toEqual(DEFAULTS);
    });

    it("returns a previously saved setup", () => {
        const setup = {
            boardSize: 9 as const,
            handicap: 3,
            draftSource: "image" as const,
        };
        saveHomeSetup(setup);
        expect(loadHomeSetup()).toEqual(setup);
    });

    it("falls back to defaults for invalid boardSize", () => {
        window.localStorage.setItem(
            "go-recorder:home-setup",
            JSON.stringify({ ...DEFAULTS, boardSize: 7 })
        );
        expect(loadHomeSetup().boardSize).toBe(19);
    });

    it("falls back to defaults for invalid handicap", () => {
        window.localStorage.setItem(
            "go-recorder:home-setup",
            JSON.stringify({ ...DEFAULTS, handicap: 10 })
        );
        expect(loadHomeSetup().handicap).toBe(0);
    });

    it("falls back to defaults for invalid draftSource", () => {
        window.localStorage.setItem(
            "go-recorder:home-setup",
            JSON.stringify({ ...DEFAULTS, draftSource: "video" })
        );
        expect(loadHomeSetup().draftSource).toBe("blank");
    });

    it("falls back to defaults for corrupt JSON", () => {
        window.localStorage.setItem("go-recorder:home-setup", "not-json");
        expect(loadHomeSetup()).toEqual(DEFAULTS);
    });

    it("falls back to defaults for non-object JSON", () => {
        window.localStorage.setItem("go-recorder:home-setup", "42");
        expect(loadHomeSetup()).toEqual(DEFAULTS);
    });
});

describe("saveHomeSetup", () => {
    beforeEach(() => {
        vi.stubGlobal("window", { localStorage: createStorageMock() });
    });

    it("persists all fields", () => {
        saveHomeSetup({ boardSize: 13, handicap: 2, draftSource: "image" });
        expect(loadHomeSetup()).toEqual({ boardSize: 13, handicap: 2, draftSource: "image" });
    });

    it("overwrites a previously saved setup", () => {
        saveHomeSetup({ boardSize: 9, handicap: 0, draftSource: "blank" });
        saveHomeSetup({ boardSize: 13, handicap: 4, draftSource: "image" });
        expect(loadHomeSetup().boardSize).toBe(13);
        expect(loadHomeSetup().handicap).toBe(4);
    });
});
