"use client";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useRef } from "react";

const REVEAL_THRESHOLD_PX = 28;

export function shouldRevealDeleteAction(deltaX: number) {
    return deltaX <= -REVEAL_THRESHOLD_PX;
}

export default function SwipeDeleteRow({
    children,
    deleteLabel,
    isRevealed,
    onActivate,
    onDelete,
    onReveal,
}: {
    children: ReactNode;
    deleteLabel: string;
    isRevealed: boolean;
    onActivate: () => void;
    onDelete: () => void;
    onReveal: () => void;
}) {
    const dragStartXRef = useRef<number | null>(null);
    const draggedRef = useRef(false);

    function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
        dragStartXRef.current = event.clientX;
        draggedRef.current = false;
    }

    function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
        const dragStartX = dragStartXRef.current;
        if (dragStartX === null) return;

        const deltaX = event.clientX - dragStartX;
        if (!shouldRevealDeleteAction(deltaX)) return;

        draggedRef.current = true;
        onReveal();
    }

    function handlePointerUp() {
        dragStartXRef.current = null;
    }

    function handleActivate() {
        if (draggedRef.current) {
            draggedRef.current = false;
            return;
        }

        onActivate();
    }

    return (
        <div className="flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <button
                type="button"
                onClick={handleActivate}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="flex min-w-0 flex-1 touch-pan-y items-center gap-3 bg-white px-3 py-3 text-left hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            >
                {children}
            </button>
            <div
                className={`flex shrink-0 items-stretch bg-red-600 text-white transition-[width] dark:bg-red-700 ${
                    isRevealed ? "w-28" : "w-12"
                }`}
            >
                <button
                    type="button"
                    aria-label={deleteLabel}
                    title={deleteLabel}
                    onClick={onDelete}
                    className="flex h-full w-full items-center justify-center gap-1 px-3 text-sm font-medium hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white dark:hover:bg-red-600"
                >
                    <Trash2 size={16} />
                    {isRevealed && <span>{deleteLabel}</span>}
                </button>
            </div>
        </div>
    );
}
