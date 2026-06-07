import { describe, expect, it } from "vitest";

import {
    createAbsoluteShareUrl,
    shouldAutoCreateShare,
    shouldGenerateShareQrCode,
} from "../lib/shareMenu";

describe("share menu helpers", () => {
    it("creates absolute share URLs", () => {
        expect(
            createAbsoluteShareUrl({
                origin: "https://example.com",
                sharePath: "/shares/game123",
            })
        ).toBe("https://example.com/shares/game123");
    });

    it("generates QR codes only when the menu is open, enabled, and has a share path", () => {
        expect(
            shouldGenerateShareQrCode({
                isOpen: true,
                sharePath: "/shares/game123",
                shouldGenerateQrCode: true,
            })
        ).toBe(true);

        expect(
            shouldGenerateShareQrCode({
                isOpen: false,
                sharePath: "/shares/game123",
                shouldGenerateQrCode: true,
            })
        ).toBe(false);

        expect(
            shouldGenerateShareQrCode({
                isOpen: true,
                sharePath: null,
                shouldGenerateQrCode: true,
            })
        ).toBe(false);

        expect(
            shouldGenerateShareQrCode({
                isOpen: true,
                sharePath: "/shares/game123",
                shouldGenerateQrCode: false,
            })
        ).toBe(false);
    });

    it("auto-creates shares only for an open eligible chooser menu without an existing link", () => {
        expect(
            shouldAutoCreateShare({
                canAutoCreate: true,
                hasAttempted: false,
                isOpen: true,
                mode: "chooser",
                sharePath: null,
            })
        ).toBe(true);

        expect(
            shouldAutoCreateShare({
                canAutoCreate: false,
                hasAttempted: false,
                isOpen: true,
                mode: "chooser",
                sharePath: null,
            })
        ).toBe(false);

        expect(
            shouldAutoCreateShare({
                canAutoCreate: true,
                hasAttempted: true,
                isOpen: true,
                mode: "chooser",
                sharePath: null,
            })
        ).toBe(false);

        expect(
            shouldAutoCreateShare({
                canAutoCreate: true,
                hasAttempted: false,
                isOpen: true,
                mode: "created",
                sharePath: null,
            })
        ).toBe(false);

        expect(
            shouldAutoCreateShare({
                canAutoCreate: true,
                hasAttempted: false,
                isOpen: true,
                mode: "chooser",
                sharePath: "/shares/game123",
            })
        ).toBe(false);
    });
});
