import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ShareMenu from "../components/ShareMenu";

function renderShareMenu(alignToViewportTop: boolean) {
    return renderToStaticMarkup(
        <ShareMenu
            alignToViewportTop={alignToViewportTop}
            canShareGame
            isCreating={false}
            menuRef={createRef<HTMLDivElement>()}
            message={null}
            mode="chooser"
            onCreateShare={vi.fn()}
            onDownloadSgf={vi.fn()}
            onCopyLink={vi.fn()}
            qrCodeDataUrl={null}
            sharePath={null}
        />
    );
}

describe("ShareMenu", () => {
    it("anchors below the header by default", () => {
        expect(renderShareMenu(false)).toContain("top-16");
    });

    it("anchors to the top of the viewport in compact header layouts", () => {
        expect(renderShareMenu(true)).toContain("top-3");
    });
});
