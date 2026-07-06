import type { BoardCorner, DetectionResult } from "./boardDetection";
import { isCornerEstimate, isDetectionResult } from "./boardDetection";
import { t } from "./i18n";

type DetectBoardInput = {
    image: Blob;
    imageName: string;
    corners: BoardCorner[];
};

export async function detectBoard({
    image,
    imageName,
    corners,
}: DetectBoardInput): Promise<DetectionResult> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error(t("detectionNetworkError"));
    }

    const formData = new FormData();
    formData.set("image", image, imageName);
    formData.set("corners", JSON.stringify(corners));

    let response: Response;
    try {
        response = await fetch("/api/detect-board", {
            method: "POST",
            body: formData,
        });
    } catch {
        throw new Error(t("detectionNetworkError"));
    }

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
        throw new Error(body?.error ?? t("detectionFailed"));
    }

    const body: unknown = await response.json().catch(() => null);
    if (!isDetectionResult(body)) {
        throw new Error(t("detectionFailed"));
    }

    return body;
}

type DetectCornersInput = {
    image: Blob;
    imageName: string;
};

/**
 * Suggested board corners in natural image pixels, or null when the service
 * finds no board grid or is unreachable. Failures are silent: the caller
 * keeps its default corner placement.
 */
export async function detectCorners({
    image,
    imageName,
}: DetectCornersInput): Promise<BoardCorner[] | null> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return null;
    }

    const formData = new FormData();
    formData.set("image", image, imageName);

    let response: Response;
    try {
        response = await fetch("/api/detect-corners", {
            method: "POST",
            body: formData,
        });
    } catch {
        return null;
    }
    if (!response.ok) {
        return null;
    }

    const body: unknown = await response.json().catch(() => null);
    if (!isCornerEstimate(body)) {
        return null;
    }
    return body.corners;
}
