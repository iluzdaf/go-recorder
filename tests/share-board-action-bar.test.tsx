import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ShareBoardActionBar from "../components/ShareBoardActionBar";

const noop = vi.fn();
const ref = { current: null };

function renderActionBar({
    boardReady,
    totalMoveCount = 4,
    visibleMoveCount = 2,
}: {
    boardReady?: boolean;
    totalMoveCount?: number;
    visibleMoveCount?: number;
}) {
    return renderToStaticMarkup(
        <ShareBoardActionBar
            anchor="right"
            dragX={null}
            onJumpToEnd={noop}
            onJumpToStart={noop}
            onLostPointerCapture={noop}
            onNextMove={noop}
            onPointerCancel={noop}
            onPointerDown={noop}
            onPointerMove={noop}
            onPointerUp={noop}
            onPreviousMove={noop}
            onTogglePanel={noop}
            panelOpen={false}
            railRef={ref}
            shareTriggerRef={ref}
            boardReady={boardReady}
            totalMoveCount={totalMoveCount}
            visibleMoveCount={visibleMoveCount}
        />
    );
}

describe("ShareBoardActionBar", () => {
    it("disables all move navigation before the board is ready", () => {
        const markup = renderActionBar({ boardReady: false });

        expect(markup).toContain('aria-label="Go to start"');
        expect(markup).toContain('aria-label="Previous move"');
        expect(markup).toContain('aria-label="Next move"');
        expect(markup).toContain('aria-label="Go to end"');
        expect(markup.match(/disabled=""/g)).toHaveLength(4);
    });

    it("keeps normal start and end disabled states once ready", () => {
        expect(
            renderActionBar({
                boardReady: true,
                totalMoveCount: 4,
                visibleMoveCount: 0,
            }).match(/disabled=""/g)
        ).toHaveLength(2);

        expect(
            renderActionBar({
                boardReady: true,
                totalMoveCount: 4,
                visibleMoveCount: 4,
            }).match(/disabled=""/g)
        ).toHaveLength(2);
    });
});
