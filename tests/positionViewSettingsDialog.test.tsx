import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import PositionViewSettingsDialog from "../components/PositionViewSettingsDialog";

function renderDialog(alignToViewportTop: boolean) {
    return renderToStaticMarkup(
        <PositionViewSettingsDialog
            alignToViewportTop={alignToViewportTop}
            boardSize={19}
            onApply={vi.fn()}
            onClose={vi.fn()}
            positionView={null}
        />
    );
}

describe("PositionViewSettingsDialog", () => {
    it("anchors below the header by default", () => {
        expect(renderDialog(false)).toContain("top-16");
    });

    it("anchors to the top of the viewport in compact header layouts", () => {
        const markup = renderDialog(true);

        expect(markup).toContain("absolute");
        expect(markup).toContain("right-4");
        expect(markup).toContain("top-4");
    });
});
