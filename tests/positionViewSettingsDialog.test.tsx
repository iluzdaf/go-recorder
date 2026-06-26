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
    it("uses a side-by-side layout in wide contexts", () => {
        expect(renderDialog(true)).toContain(
            "sm:grid-cols-[minmax(0,1fr)_10rem]"
        );
    });

    it("uses a stacked layout by default", () => {
        expect(renderDialog(false)).toContain("flex flex-col gap-2");
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
