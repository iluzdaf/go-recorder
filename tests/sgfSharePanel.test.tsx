import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

import SgfSharePanel from "../components/SgfSharePanel";
import { t } from "../lib/i18n";

const noop = vi.fn();

function renderPanel({
    boardSize,
    initialActiveTab,
    isCreating = false,
    message = null,
    onChangePositionView,
}: {
    boardSize?: 9 | 13 | 19;
    initialActiveTab?: "sgf" | "share";
    isCreating?: boolean;
    message?: string | null;
    onChangePositionView?: () => void;
}) {
    return renderToStaticMarkup(
        <SgfSharePanel
            menuRef={createRef<HTMLDivElement>()}
            initialActiveTab={initialActiveTab}
            blackPlayerName={null}
            whitePlayerName={null}
            boardSize={boardSize}
            onChangePositionView={onChangePositionView}
            canShareGame={false}
            isCreating={isCreating}
            message={message}
            mode="chooser"
            onCreateShare={noop}
            onDownloadSgf={noop}
            onCopyLink={noop}
            qrCodeDataUrl={null}
            sharePath={null}
        />
    );
}

describe("SgfSharePanel accordion sections", () => {
    it("shows the position view section for board drafts", () => {
        const markup = renderPanel({ boardSize: 19, onChangePositionView: noop });
        expect(markup).toContain(t("positionView"));
    });

    it("hides the position view section when onChangePositionView is absent", () => {
        const markup = renderPanel({ boardSize: 19 });
        expect(markup).not.toContain(t("positionView"));
    });

    it("hides the position view section when boardSize is absent", () => {
        const markup = renderPanel({ onChangePositionView: noop });
        expect(markup).not.toContain(t("positionView"));
    });

    it("always shows the players and rules sections", () => {
        const markup = renderPanel({});
        expect(markup).toContain(t("players"));
        expect(markup).toContain(t("rules"));
    });

    it("locks tab switching while creating a share", () => {
        const markup = renderPanel({
            initialActiveTab: "share",
            isCreating: true,
            message: t("creatingShare"),
        });

        expect(markup).toContain('role="tab"');
        expect(markup.match(/disabled=""/g)?.length).toBe(2);
        expect(markup).toContain(t("creatingShare"));
    });
});
