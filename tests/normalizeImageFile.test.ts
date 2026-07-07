import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeImageFile } from "../lib/normalizeImageFile";

function makeFile(name = "photo.heic") {
    return new File([new Uint8Array([1, 2, 3])], name, { type: "image/heic" });
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("normalizeImageFile", () => {
    it("returns the original file when createImageBitmap is unavailable", async () => {
        const file = makeFile();
        expect(await normalizeImageFile(file)).toBe(file);
    });

    it("re-encodes through a canvas at the oriented bitmap size", async () => {
        const bitmap = { width: 30, height: 40, close: vi.fn() };
        vi.stubGlobal(
            "createImageBitmap",
            vi.fn().mockResolvedValue(bitmap)
        );
        const context = { drawImage: vi.fn() };
        const encoded = new Blob([new Uint8Array([9, 9])], {
            type: "image/jpeg",
        });
        const canvas = {
            width: 0,
            height: 0,
            getContext: vi.fn().mockReturnValue(context),
            toBlob: (callback: (blob: Blob | null) => void) =>
                callback(encoded),
        };
        vi.stubGlobal("document", {
            createElement: vi.fn().mockReturnValue(canvas),
        });

        const result = await normalizeImageFile(makeFile("IMG_1.HEIC"));

        expect(canvas.width).toBe(30);
        expect(canvas.height).toBe(40);
        expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
        expect(bitmap.close).toHaveBeenCalled();
        expect(result.name).toBe("IMG_1.jpg");
        expect(result.type).toBe("image/jpeg");
    });

    it("falls back to the original file when decoding fails", async () => {
        vi.stubGlobal(
            "createImageBitmap",
            vi.fn().mockRejectedValue(new Error("undecodable"))
        );
        const file = makeFile();
        expect(await normalizeImageFile(file)).toBe(file);
    });
});
