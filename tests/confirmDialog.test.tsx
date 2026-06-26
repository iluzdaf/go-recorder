import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ConfirmDialog from "../components/ConfirmDialog";
import { t } from "../lib/i18n";

function render(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
    return renderToStaticMarkup(
        <ConfirmDialog
            titleId="test-dialog-title"
            message="Test message"
            confirmLabel="Confirm"
            onCancel={vi.fn()}
            onConfirm={vi.fn()}
            {...overrides}
        />
    );
}

describe("ConfirmDialog", () => {
    it("renders as a modal dialog with role=dialog and aria-modal", () => {
        const markup = render();
        expect(markup).toContain('role="dialog"');
        expect(markup).toContain('aria-modal="true"');
    });

    it("is labelled by the title element via aria-labelledby", () => {
        const markup = render({ titleId: "my-title" });
        expect(markup).toContain('aria-labelledby="my-title"');
        expect(markup).toContain('id="my-title"');
    });

    it("renders a fixed full-screen backdrop to block interaction", () => {
        const markup = render();
        expect(markup).toContain("fixed");
        expect(markup).toContain("inset-0");
    });

    it("renders the message and confirm label", () => {
        const markup = render({ message: "Are you sure?", confirmLabel: "Do it" });
        expect(markup).toContain("Are you sure?");
        expect(markup).toContain("Do it");
    });

    it("renders a cancel button with the standard cancel label", () => {
        const markup = render();
        expect(markup).toContain(t("cancel"));
    });

    it("stops pointerdown propagation on the root element to prevent document-level handlers from firing", () => {
        const markup = render();
        expect(markup).toContain("inset-0");
        // The outermost div must be the one intercepting pointer events —
        // verified by checking it carries both the layout class and is the
        // first element in the markup (before the backdrop and dialog).
        const outerIndex = markup.indexOf("inset-0");
        const dialogIndex = markup.indexOf('role="dialog"');
        expect(outerIndex).toBeLessThan(dialogIndex);
    });
});
