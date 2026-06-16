import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ImageDraftCreator, {
    createImageDetectionRequest,
} from "../components/ImageDraftCreator";
import { createInitialCorners } from "../lib/imageCorners";
import { t } from "../lib/i18n";

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

describe("ImageDraftCreator", () => {
    it("renders the initial image upload overlay without detect controls", () => {
        const markup = renderToStaticMarkup(
            <ImageDraftCreator onClose={vi.fn()} />
        );

        expect(markup).toContain(t("selectBoardImage"));
        expect(markup).toContain(`aria-label="${t("cancelImport")}"`);
        expect(markup).not.toContain(t("detectPosition"));
    });

    it("builds the detection request from the selected image and natural image size", () => {
        const file = new File(["image"], "board.png", { type: "image/png" });
        const request = createImageDetectionRequest({
            file,
            corners: createInitialCorners(0.1),
            naturalWidth: 1000,
            naturalHeight: 500,
        });

        expect(request).toEqual({
            image: file,
            imageName: "board.png",
            corners: [
                { x: 100, y: 50 },
                { x: 900, y: 50 },
                { x: 900, y: 450 },
                { x: 100, y: 450 },
            ],
        });
    });
});
