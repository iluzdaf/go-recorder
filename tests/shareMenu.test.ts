import { describe, expect, it } from "vitest";

import {
    createAbsoluteShareUrl,
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
});
