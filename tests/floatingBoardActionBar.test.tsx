import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import FloatingBoardActionBar, {
    ActionBarDragHandle,
} from "../components/FloatingBoardActionBar";

describe("FloatingBoardActionBar", () => {
    it("does not let the transparent rail intercept board pointer input", () => {
        const markup = renderToStaticMarkup(
            <FloatingBoardActionBar
                anchor="left"
                dragX={null}
                railRef={createRef<HTMLDivElement>()}
            >
                <button type="button">Share</button>
            </FloatingBoardActionBar>
        );

        expect(markup).toContain("pointer-events-none");
        expect(markup).toContain("pointer-events-auto absolute left-0");
    });

    it("keeps the drag handle interactive", () => {
        const noop = vi.fn();
        const markup = renderToStaticMarkup(
            <ActionBarDragHandle
                onLostPointerCapture={noop}
                onPointerCancel={noop}
                onPointerDown={noop}
                onPointerMove={noop}
                onPointerUp={noop}
            />
        );

        expect(markup).toContain("cursor-grab");
        expect(markup).not.toContain("pointer-events-none");
    });
});
