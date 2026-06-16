import type { BoardCorner, DetectionResult } from "./boardDetection";
import { isDetectionResult } from "./boardDetection";
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
