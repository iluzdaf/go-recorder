import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import PositionViewSettingsDialog from "../components/PositionViewSettingsDialog";
import { t } from "../lib/i18n";

function renderDialog(alignToViewportTop: boolean) {
    return renderToStaticMarkup(
        <PositionViewSettingsDialog
            alignToViewportTop={alignToViewportTop}
            boardSize={19}
            onChange={vi.fn()}
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
        expect(markup).toContain("42rem");
        expect(markup).toContain("sm:grid-cols-[minmax(0,1fr)_10rem]");
    });

    it("uses menu-style instant controls instead of close and apply actions", () => {
        const markup = renderDialog(false);

        expect(markup).not.toContain(`>${t("cancel")}<`);
        expect(markup).not.toContain(`>${t("apply")}<`);
        expect(markup).not.toContain(`>${t("fullBoard")}<`);
        expect(markup).toContain('aria-label="Top left"');
        expect(markup).toContain("<svg");
    });
});
