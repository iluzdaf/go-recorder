import { describe, expect, it } from "vitest";

import {
    formatShareDate,
    getShareDescription,
    getShareTitle,
} from "../lib/sharePresentation";

describe("getShareTitle", () => {
    it("uses both names with vs", () => {
        expect(
            getShareTitle({
                blackPlayerName: "Black",
                whitePlayerName: "White",
                sourceKind: "game",
            })
        ).toBe("Black vs White");
    });

    it("uses a single black or white name", () => {
        expect(
            getShareTitle({
                blackPlayerName: "Black",
                whitePlayerName: null,
                sourceKind: "game",
            })
        ).toBe("Black");
        expect(
            getShareTitle({
                blackPlayerName: null,
                whitePlayerName: "White",
                sourceKind: "game",
            })
        ).toBe("White");
    });

    it("falls back to share type titles when names are missing", () => {
        expect(
            getShareTitle({
                blackPlayerName: null,
                whitePlayerName: null,
                sourceKind: "game",
            })
        ).toBe("Shared Go game");
        expect(
            getShareTitle({
                blackPlayerName: null,
                whitePlayerName: null,
                draftKind: "board",
                sourceKind: "draft",
            })
        ).toBe("Shared Go position");
        expect(
            getShareTitle({
                blackPlayerName: null,
                whitePlayerName: null,
                draftKind: "variation",
                sourceKind: "draft",
            })
        ).toBe("Shared Go variation");
    });
});

describe("getShareDescription", () => {
    it("uses copy by share type", () => {
        expect(getShareDescription({ sourceKind: "game" })).toBe(
            "View this shared Go game"
        );
        expect(
            getShareDescription({
                draftKind: "board",
                sourceKind: "draft",
            })
        ).toBe("View this shared Go game position");
        expect(
            getShareDescription({
                draftKind: "variation",
                sourceKind: "draft",
            })
        ).toBe("View this shared Go variation");
    });
});

describe("formatShareDate", () => {
    it("formats share dates in UTC", () => {
        expect(formatShareDate("2026-05-29T00:00:00.000Z")).toBe(
            "29 May 2026"
        );
    });
});
