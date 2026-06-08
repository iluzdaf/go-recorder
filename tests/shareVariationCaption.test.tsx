import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CapturedVariationMoveCaption } from "../components/ShareGoBoard";

describe("CapturedVariationMoveCaption", () => {
    it("renders compact top caption entries with move color", () => {
        const markup = renderToStaticMarkup(
            <CapturedVariationMoveCaption
                entries={[
                    {
                        color: "B",
                        coordinate: "J15",
                        label: "12 at J15",
                        moveIndex: 11,
                        moveNumber: 12,
                        x: 8,
                        y: 4,
                    },
                ]}
                onCommit={vi.fn()}
                onPreview={vi.fn()}
                onRestorePreview={vi.fn()}
            />
        );

        expect(markup).toContain("top-4");
        expect(markup).toContain("button");
        expect(markup).toContain('aria-label="Black 12 at J15"');
        expect(markup).toContain("12 at J15");
        expect(markup).not.toContain("rounded-full");
    });

    it("renders nothing without captured variation moves", () => {
        expect(
            renderToStaticMarkup(
                <CapturedVariationMoveCaption
                    entries={[]}
                    onCommit={vi.fn()}
                    onPreview={vi.fn()}
                    onRestorePreview={vi.fn()}
                />
            )
        ).toBe("");
    });
});
