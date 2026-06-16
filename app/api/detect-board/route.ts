export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { isDetectionResult } from "../../../lib/boardDetection";
import { t } from "../../../lib/i18n";

export async function POST(request: Request) {
    const serviceUrl = process.env.DETECTION_SERVICE_URL;
    if (!serviceUrl) {
        return NextResponse.json(
            { error: t("detectionUnavailable") },
            { status: 503 }
        );
    }

    let incoming: FormData;
    try {
        incoming = await request.formData();
    } catch {
        return NextResponse.json(
            { error: t("detectionInvalidInput") },
            { status: 400 }
        );
    }

    const image = incoming.get("image");
    const corners = incoming.get("corners");
    if (!(image instanceof File) || typeof corners !== "string") {
        return NextResponse.json(
            { error: t("detectionInvalidInput") },
            { status: 400 }
        );
    }

    const forwarded = new FormData();
    forwarded.set("image", image, image.name || "board");
    forwarded.set("corners", corners);

    const headers: Record<string, string> = {};
    const apiKey = process.env.DETECTION_API_KEY;
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    let response: Response;
    try {
        response = await fetch(`${serviceUrl.replace(/\/$/, "")}/detect`, {
            method: "POST",
            body: forwarded,
            headers,
        });
    } catch {
        return NextResponse.json(
            { error: t("detectionNetworkError") },
            { status: 502 }
        );
    }

    if (!response.ok) {
        return NextResponse.json(
            { error: t("detectionFailed") },
            { status: 502 }
        );
    }

    const body: unknown = await response.json().catch(() => null);
    if (!isDetectionResult(body)) {
        return NextResponse.json(
            { error: t("detectionFailed") },
            { status: 502 }
        );
    }

    return NextResponse.json(body);
}
