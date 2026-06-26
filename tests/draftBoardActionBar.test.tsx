import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import DraftBoardActionBar from "../components/DraftBoardActionBar";
import { t } from "../lib/i18n";

const noop = vi.fn();

function renderActionBar(mode: "board" | "variation") {
    return renderToStaticMarkup(
        <DraftBoardActionBar
            anchor="left"
            canShareDraft
            canUndo={false}
            dragX={null}
            mode={mode}
            onLostPointerCapture={noop}
            onPointerCancel={noop}
            onPointerDown={noop}
            onPointerMove={noop}
            onPointerUp={noop}
            onToggleColor={noop}
            onToggleShareMenu={noop}
            onUndo={noop}
            railRef={createRef<HTMLDivElement>()}
            selectedColor="B"
            shareMenuOpen={false}
            shareTriggerRef={createRef<HTMLButtonElement>()}
        />
    );
}

describe("DraftBoardActionBar", () => {
    it("shows the stone color toggle for board drafts", () => {
        expect(renderActionBar("board")).toContain(t("toggleDraftStoneColor"));
    });

    it("hides board-only controls for variation drafts", () => {
        expect(renderActionBar("variation")).not.toContain(
            t("toggleDraftStoneColor")
        );
    });
});
