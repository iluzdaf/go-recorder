import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ShareMenu from "../components/ShareMenu";

function renderShareMenu({
    alignToViewportTop,
    mode = "chooser",
    sharePath = null,
}: {
    alignToViewportTop: boolean;
    mode?: "chooser" | "created";
    sharePath?: string | null;
}) {
    return renderToStaticMarkup(
        <ShareMenu
            alignToViewportTop={alignToViewportTop}
            canShareGame
            isCreating={false}
            menuRef={createRef<HTMLDivElement>()}
            message={null}
            mode={mode}
            onCreateShare={vi.fn()}
            onDownloadSgf={vi.fn()}
            onCopyLink={vi.fn()}
            qrCodeDataUrl="data:image/png;base64,abc"
            sharePath={sharePath}
        />
    );
}

describe("ShareMenu", () => {
    it("anchors below the header by default", () => {
        expect(renderShareMenu({ alignToViewportTop: false })).toContain("top-16");
    });

    it("anchors to the top of the viewport in compact header layouts", () => {
        const markup = renderShareMenu({ alignToViewportTop: true });

        expect(markup).toContain("absolute");
        expect(markup).toContain("right-4");
        expect(markup).toContain("top-4");
    });

    it("uses a horizontal created-share layout in compact header layouts", () => {
        const markup = renderShareMenu({
            alignToViewportTop: true,
            mode: "created",
            sharePath: "/shares/share123",
        });

        expect(markup).toContain("w-[min(42rem,calc(100vw-2rem))]");
        expect(markup).toContain("grid-cols-[minmax(0,1fr)_12rem]");
        expect(markup).toContain("h-40 w-40");
    });

    it("keeps the created-share layout stacked by default", () => {
        const markup = renderShareMenu({
            alignToViewportTop: false,
            mode: "created",
            sharePath: "/shares/share123",
        });

        expect(markup).toContain("w-[min(24rem,calc(100vw-2rem))]");
        expect(markup).toContain("flex flex-col gap-2");
        expect(markup).toContain("h-48 w-48");
    });
});
