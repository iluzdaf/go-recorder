import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CapturedVariationMoveCaption } from "../components/ShareGoBoard";

describe("CapturedVariationMoveCaption", () => {
    it("renders compact top caption chips for captured variation moves", () => {
        const markup = renderToStaticMarkup(
            <CapturedVariationMoveCaption
                entries={[
                    {
                        label: "12 at J15",
                        moveIndex: 11,
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
        expect(markup).toContain("12 at J15");
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
