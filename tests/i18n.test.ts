import { describe, expect, it } from "vitest";

import { formatMoveEditError, t } from "../lib/i18n";

describe("formatMoveEditError", () => {
    it("maps legality failures to a translated correction message", () => {
        expect(formatMoveEditError("Ko prevented")).toBe(
            t("stoneCorrectionIllegal")
        );
        expect(formatMoveEditError("Overwrite prevented")).toBe(
            t("stoneCorrectionIllegal")
        );
        expect(formatMoveEditError("Suicide prevented")).toBe(
            t("stoneCorrectionIllegal")
        );
        expect(formatMoveEditError("Edit destination is out of bounds")).toBe(
            t("stoneCorrectionIllegal")
        );
    });

    it("maps future capture changes to a translated correction message", () => {
        expect(formatMoveEditError("Edit changes future captures")).toBe(
            t("stoneCorrectionChangesCaptures")
        );
    });

    it("maps multi-stone tap attempts to a translated correction message", () => {
        expect(formatMoveEditError("Multiple stones need a drag origin")).toBe(
            t("stoneCorrectionNeedsDrag")
        );
    });

    it("uses a fallback translated correction message", () => {
        expect(formatMoveEditError("Unexpected replay failure")).toBe(
            t("stoneCorrectionFailed")
        );
    });
});
