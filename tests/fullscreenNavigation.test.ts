import { describe, expect, it } from "vitest";

import { isDocumentFullscreenActive } from "../lib/fullscreenNavigation";

describe("fullscreen navigation helpers", () => {
    it("detects standard fullscreen state", () => {
        const documentValue = {
            fullscreenElement: {},
        } as Document;

        expect(isDocumentFullscreenActive(documentValue)).toBe(true);
    });

    it("detects webkit fullscreen state", () => {
        const documentValue = {
            fullscreenElement: null,
            webkitFullscreenElement: {},
        } as Document & { webkitFullscreenElement: Element };

        expect(isDocumentFullscreenActive(documentValue)).toBe(true);
    });

    it("detects current webkit fullscreen state", () => {
        const documentValue = {
            fullscreenElement: null,
            webkitFullscreenElement: null,
            webkitCurrentFullScreenElement: {},
        } as Document & {
            webkitCurrentFullScreenElement: Element;
            webkitFullscreenElement: null;
        };

        expect(isDocumentFullscreenActive(documentValue)).toBe(true);
    });

    it("returns false outside fullscreen", () => {
        const documentValue = {
            fullscreenElement: null,
            webkitFullscreenElement: null,
        } as Document & { webkitFullscreenElement: null };

        expect(isDocumentFullscreenActive(documentValue)).toBe(false);
    });
});
