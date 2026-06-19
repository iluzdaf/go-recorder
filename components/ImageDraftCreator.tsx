"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

import { createBoardDraftInputFromDetection } from "../lib/boardDetectionDraft";
import { detectBoard } from "../lib/detectBoardClient";
import { createLocalDraft } from "../lib/localGames";
import { storeImageSource } from "../lib/localImageStorage";
import { navigateWithinApp } from "../lib/fullscreenNavigation";
import { t } from "../lib/i18n";
import {
    cornerToDisplay,
    createInitialCorners,
    scaleCornersToNatural,
    updateCorner,
    type CornerIndex,
    type OrderedCorners,
} from "../lib/imageCorners";

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

type ImageDraftCreatorProps = {
    onClose: () => void;
};

type SelectedImage = {
    file: File;
    url: string;
};

type ImageBox = {
    left: number;
    top: number;
    width: number;
    height: number;
};

export function createImageDetectionRequest({
    corners,
    file,
    naturalHeight,
    naturalWidth,
}: {
    corners: OrderedCorners;
    file: File;
    naturalHeight: number;
    naturalWidth: number;
}) {
    const naturalCorners = scaleCornersToNatural(corners, {
        naturalWidth,
        naturalHeight,
    });

    return {
        image: file,
        imageName: file.name,
        corners: [...naturalCorners],
    };
}

export default function ImageDraftCreator({ onClose }: ImageDraftCreatorProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const draggingRef = useRef<CornerIndex | null>(null);

    const [image, setImage] = useState<SelectedImage | null>(null);
    const [corners, setCorners] = useState<OrderedCorners | null>(null);
    const [imageBox, setImageBox] = useState<ImageBox>({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
    });
    const [isDetecting, setIsDetecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const measureImageBox = useCallback(() => {
        const container = containerRef.current;
        const element = imageRef.current;
        if (!container || !element) return;

        const containerRect = container.getBoundingClientRect();
        const imageRect = element.getBoundingClientRect();
        setImageBox({
            left: imageRect.left - containerRect.left,
            top: imageRect.top - containerRect.top,
            width: imageRect.width,
            height: imageRect.height,
        });
    }, []);

    useEffect(() => {
        return () => {
            if (image) {
                URL.revokeObjectURL(image.url);
            }
        };
    }, [image]);

    useEffect(() => {
        const element = imageRef.current;
        if (!image || !element) return;

        const observer = new ResizeObserver(() => measureImageBox());
        observer.observe(element);
        window.addEventListener("resize", measureImageBox);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measureImageBox);
        };
    }, [image, measureImageBox]);

    function handleSelectFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setError(null);
        setCorners(null);
        setImage((previous) => {
            if (previous) URL.revokeObjectURL(previous.url);
            return { file, url: URL.createObjectURL(file) };
        });
    }

    function handleImageLoad() {
        setCorners(createInitialCorners());
        measureImageBox();
    }

    function handleHandlePointerDown(index: CornerIndex) {
        return (event: React.PointerEvent<HTMLDivElement>) => {
            event.preventDefault();
            draggingRef.current = index;
            event.currentTarget.setPointerCapture(event.pointerId);
        };
    }

    function handleHandlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        const index = draggingRef.current;
        const element = imageRef.current;
        if (index === null || !element) return;

        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        setCorners((previous) =>
            previous
                ? updateCorner(previous, index, {
                      x: (event.clientX - rect.left) / rect.width,
                      y: (event.clientY - rect.top) / rect.height,
                  })
                : previous
        );
    }

    function handleHandlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
        draggingRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    }

    async function handleDetect() {
        const element = imageRef.current;
        if (!image || !corners || !element) return;

        setIsDetecting(true);
        setError(null);

        try {
            const naturalWidth = element.naturalWidth;
            const naturalHeight = element.naturalHeight;

            const [detection, dataUrl] = await Promise.all([
                detectBoard(
                    createImageDetectionRequest({
                        file: image.file,
                        corners,
                        naturalWidth,
                        naturalHeight,
                    })
                ),
                readFileAsDataUrl(image.file),
            ]);

            let imageSourceId: string | null = null;
            try {
                imageSourceId = await storeImageSource({
                    dataUrl,
                    naturalWidth,
                    naturalHeight,
                    corners,
                });
            } catch {
                // Non-fatal: draft is still created; overlay will be unavailable
            }

            const draft = createLocalDraft({
                ...createBoardDraftInputFromDetection(detection),
                imageSourceId,
            });
            navigateWithinApp({
                path: `/drafts/${draft.id}`,
                push: router.push,
            });
        } catch (caught) {
            setError(
                caught instanceof Error ? caught.message : t("detectionFailed")
            );
            setIsDetecting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/90 p-4 text-white">
            <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3">
                <div className="flex shrink-0 items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDetecting}
                        aria-label={t("cancelImport")}
                        title={t("cancelImport")}
                        className="inline-flex h-9 w-9 items-center justify-center rounded text-zinc-300 hover:text-white disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>

                    {image && (
                        <button
                            type="button"
                            onClick={handleDetect}
                            disabled={isDetecting || !corners}
                            className="inline-flex items-center gap-2 rounded bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                        >
                            {isDetecting && (
                                <Loader2 size={16} className="animate-spin" />
                            )}
                            {isDetecting
                                ? t("detectingPosition")
                                : error
                                  ? t("retryDetection")
                                  : t("detectPosition")}
                        </button>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSelectFile}
                    className="hidden"
                />

                {!image ? (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-zinc-600 p-12 text-zinc-300 hover:border-zinc-400 hover:text-white"
                    >
                        {t("selectBoardImage")}
                    </button>
                ) : (
                    <>
                        <p className="shrink-0 text-center text-sm text-zinc-300">
                            {t("adjustCornersHint")}
                        </p>

                        <div
                            ref={containerRef}
                            className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imageRef}
                                src={image.url}
                                alt=""
                                onLoad={handleImageLoad}
                                onDragStart={(event) => event.preventDefault()}
                                draggable={false}
                                style={{ WebkitTouchCallout: "none" }}
                                className="pointer-events-none block max-h-full max-w-full select-none rounded-lg"
                            />

                            {corners && imageBox.width > 0 && (
                                <>
                                    <svg
                                        className="pointer-events-none absolute"
                                        style={{
                                            left: imageBox.left,
                                            top: imageBox.top,
                                            width: imageBox.width,
                                            height: imageBox.height,
                                        }}
                                    >
                                        <polygon
                                            points={corners
                                                .map((corner) => {
                                                    const point = cornerToDisplay(
                                                        corner,
                                                        imageBox
                                                    );
                                                    return `${point.x},${point.y}`;
                                                })
                                                .join(" ")}
                                            className="fill-sky-500/20 stroke-sky-400"
                                            strokeWidth={2}
                                        />
                                    </svg>

                                    {corners.map((corner, index) => {
                                        const point = cornerToDisplay(corner, imageBox);
                                        return (
                                            <div
                                                key={index}
                                                onPointerDown={handleHandlePointerDown(
                                                    index as CornerIndex
                                                )}
                                                onPointerMove={handleHandlePointerMove}
                                                onPointerUp={handleHandlePointerUp}
                                                style={{
                                                    left: imageBox.left + point.x,
                                                    top: imageBox.top + point.y,
                                                }}
                                                className="absolute -ml-4 -mt-4 h-8 w-8 cursor-grab touch-none rounded-full border-2 border-white bg-sky-500/70 active:cursor-grabbing"
                                            />
                                        );
                                    })}
                                </>
                            )}
                        </div>

                        {error && (
                            <p className="shrink-0 text-center text-sm text-red-400">
                                {error}
                            </p>
                        )}

                        <div className="flex shrink-0 justify-center">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isDetecting}
                                className="rounded border border-zinc-600 px-4 py-2 text-zinc-200 hover:border-zinc-400 hover:text-white disabled:opacity-50"
                            >
                                {t("changeBoardImage")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
