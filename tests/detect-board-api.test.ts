import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "../lib/i18n";
import { POST } from "../app/api/detect-board/route";

const originalEnv = {
    DETECTION_API_KEY: process.env.DETECTION_API_KEY,
    DETECTION_SERVICE_URL: process.env.DETECTION_SERVICE_URL,
};

const detectionResult = {
    boardSize: 19,
    setupStones: [{ x: 3, y: 3, color: "B" }],
    positionView: null,
    confidence: 0.9,
};

function createFormRequest({
    corners = JSON.stringify([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
    ]),
    image = new File(["image"], "board.png", { type: "image/png" }),
}: {
    corners?: string;
    image?: File | null;
} = {}) {
    const formData = new FormData();
    if (image) formData.set("image", image, image.name);
    formData.set("corners", corners);

    return new Request("http://localhost/api/detect-board", {
        method: "POST",
        body: formData,
    });
}

describe("POST /api/detect-board", () => {
    beforeEach(() => {
        process.env.DETECTION_SERVICE_URL = "https://detection.example";
        process.env.DETECTION_API_KEY = "secret";
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                Response.json(detectionResult, { status: 200 })
            )
        );
    });

    afterEach(() => {
        if (originalEnv.DETECTION_SERVICE_URL === undefined) {
            delete process.env.DETECTION_SERVICE_URL;
        } else {
            process.env.DETECTION_SERVICE_URL =
                originalEnv.DETECTION_SERVICE_URL;
        }

        if (originalEnv.DETECTION_API_KEY === undefined) {
            delete process.env.DETECTION_API_KEY;
        } else {
            process.env.DETECTION_API_KEY = originalEnv.DETECTION_API_KEY;
        }

        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("forwards the image, corners, and API key to the detection service", async () => {
        const response = await POST(createFormRequest());

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(detectionResult);
        expect(fetch).toHaveBeenCalledWith("https://detection.example/detect", {
            method: "POST",
            body: expect.any(FormData),
            headers: {
                "X-API-Key": "secret",
            },
        });

        const forwarded = vi.mocked(fetch).mock.calls[0]?.[1]?.body as FormData;
        expect(forwarded.get("corners")).toBe(
            JSON.stringify([
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 100 },
                { x: 0, y: 100 },
            ])
        );
        expect(forwarded.get("image")).toBeInstanceOf(File);
    });

    it("returns 503 without calling the service when detection is not configured", async () => {
        delete process.env.DETECTION_SERVICE_URL;

        const response = await POST(createFormRequest());

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            error: t("detectionUnavailable"),
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("rejects missing image input", async () => {
        const response = await POST(createFormRequest({ image: null }));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: t("detectionInvalidInput"),
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("maps network failures to a detection network error", async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));

        const response = await POST(createFormRequest());

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            error: t("detectionNetworkError"),
        });
    });

    it("rejects invalid detection-service responses", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            Response.json({ boardSize: 19 }, { status: 200 })
        );

        const response = await POST(createFormRequest());

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            error: t("detectionFailed"),
        });
    });

    it("maps detection-service errors to a detection failure", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            Response.json({ detail: "bad image" }, { status: 400 })
        );

        const response = await POST(createFormRequest());

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            error: t("detectionFailed"),
        });
    });
});
