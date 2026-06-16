"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createBoardDraftInputFromDetection } from "@/lib/boardDetectionDraft";
import { detectBoard } from "@/lib/detectBoardClient";
import { createLocalDraft } from "@/lib/localGames";
import { navigateWithinApp } from "@/lib/fullscreenNavigation";
import { t } from "@/lib/i18n";
import {
    createInitialCorners,
    scaleCornersToNatural,
    updateCorner,
    type CornerIndex,
    type OrderedCorners,
} from "@/lib/imageCorners";

type ImageDraftCreatorProps = {
    onClose: () => void;
};

type SelectedImage = {
    file: File;
    url: string;
};

export default function ImageDraftCreator({ onClose }: ImageDraftCreatorProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const draggingRef = useRef<CornerIndex | null>(null);

    const [image, setImage] = useState<SelectedImage | null>(null);
    const [corners, setCorners] = useState<OrderedCorners | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (image) {
                URL.revokeObjectURL(image.url);
            }
        };
    }, [image]);

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
        const element = imageRef.current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        setCorners(
            createInitialCorners({ width: rect.width, height: rect.height })
        );
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
        setCorners((previous) =>
            previous
                ? updateCorner(
                      previous,
                      index,
                      { x: event.clientX - rect.left, y: event.clientY - rect.top },
                      { width: rect.width, height: rect.height }
                  )
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

        const rect = element.getBoundingClientRect();
        const naturalCorners = scaleCornersToNatural(corners, {
            displayWidth: rect.width,
            displayHeight: rect.height,
            naturalWidth: element.naturalWidth,
            naturalHeight: element.naturalHeight,
        });

        try {
            const detection = await detectBoard({
                image: image.file,
                imageName: image.file.name,
                corners: [...naturalCorners],
            });
            const draft = createLocalDraft(
                createBoardDraftInputFromDetection(detection)
            );
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
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium">
                        {t("importBoardImageTitle")}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDetecting}
                        className="rounded px-3 py-1 text-sm text-zinc-300 hover:text-white disabled:opacity-50"
                    >
                        {t("cancelImport")}
                    </button>
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
                        <p className="text-sm text-zinc-300">
                            {t("adjustCornersHint")}
                        </p>

                        <div className="relative mx-auto w-full touch-none select-none">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imageRef}
                                src={image.url}
                                alt=""
                                onLoad={handleImageLoad}
                                onDragStart={(event) => event.preventDefault()}
                                draggable={false}
                                style={{ WebkitTouchCallout: "none" }}
                                className="pointer-events-none w-full select-none rounded-lg"
                            />

                            {corners && (
                                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                                    <polygon
                                        points={corners
                                            .map((corner) => `${corner.x},${corner.y}`)
                                            .join(" ")}
                                        className="fill-sky-500/20 stroke-sky-400"
                                        strokeWidth={2}
                                    />
                                </svg>
                            )}

                            {corners?.map((corner, index) => (
                                <div
                                    key={index}
                                    onPointerDown={handleHandlePointerDown(
                                        index as CornerIndex
                                    )}
                                    onPointerMove={handleHandlePointerMove}
                                    onPointerUp={handleHandlePointerUp}
                                    style={{ left: corner.x, top: corner.y }}
                                    className="absolute -ml-4 -mt-4 h-8 w-8 cursor-grab touch-none rounded-full border-2 border-white bg-sky-500/70 active:cursor-grabbing"
                                />
                            ))}
                        </div>

                        {error && (
                            <p className="text-sm text-red-400">{error}</p>
                        )}

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={handleDetect}
                                disabled={isDetecting || !corners}
                                className="rounded bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                            >
                                {isDetecting
                                    ? t("detectingPosition")
                                    : error
                                      ? t("retryDetection")
                                      : t("detectPosition")}
                            </button>
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
