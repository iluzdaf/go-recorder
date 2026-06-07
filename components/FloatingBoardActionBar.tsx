"use client";

import type {
    PointerEvent as ReactPointerEvent,
    ReactNode,
    RefObject,
} from "react";

import type { ActionBarAnchor } from "../lib/actionBarDrag";

type FloatingBoardActionBarProps = {
    anchor: ActionBarAnchor;
    children: ReactNode;
    dragX: number | null;
    overlay?: ReactNode;
    railRef: RefObject<HTMLDivElement | null>;
};

type ActionBarDragHandleProps = {
    onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

function DragHandleDots() {
    return (
        <span
            aria-hidden="true"
            className="grid h-6 w-4 grid-cols-2 gap-x-1 gap-y-1"
        >
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
        </span>
    );
}

export function ActionBarDragHandle({
    onLostPointerCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
}: ActionBarDragHandleProps) {
    return (
        <div
            className="flex h-11 w-10 cursor-grab items-center justify-center active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onLostPointerCapture={onLostPointerCapture}
        >
            <DragHandleDots />
        </div>
    );
}

export default function FloatingBoardActionBar({
    anchor,
    children,
    dragX,
    overlay,
    railRef,
}: FloatingBoardActionBarProps) {
    return (
        <div
            ref={railRef}
            className="pointer-events-none absolute inset-x-3 bottom-3 z-40 h-14 select-none sm:bottom-4"
        >
            <div className="relative h-full w-full">
                <div
                    className={
                        dragX !== null
                            ? "pointer-events-auto absolute top-1/2 -translate-y-1/2"
                            : anchor === "left"
                              ? "pointer-events-auto absolute left-0 top-1/2 -translate-y-1/2"
                              : "pointer-events-auto absolute right-0 top-1/2 -translate-y-1/2"
                    }
                    style={dragX !== null ? { left: `${dragX}px` } : undefined}
                >
                    {overlay}
                    <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
