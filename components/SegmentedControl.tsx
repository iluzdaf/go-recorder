"use client";

import { useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

import { nearestSegmentIndex } from "../lib/segmentControlDrag";

export type SegmentedControlOption<T> = Readonly<{
    value: T;
    content: ReactNode;
    ariaLabel: string;
    title?: string;
}>;

// Shared pill segmented control. Supports iOS-style drag selection: pressing and
// sliding across the segments updates the selection live and commits on release.
// Taps and keyboard activation keep working unchanged. `columns` fixes the grid
// column count for controls that wrap onto multiple rows (e.g. handicap).
export default function SegmentedControl<T extends string | number>({
    ariaLabel,
    className,
    columns,
    disabled = false,
    onChange,
    options,
    role,
    value,
}: Readonly<{
    ariaLabel?: string;
    className?: string;
    columns?: number;
    disabled?: boolean;
    onChange: (nextValue: T) => void;
    options: readonly SegmentedControlOption<T>[];
    role?: string;
    value: T;
}>) {
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const isDraggingRef = useRef(false);

    function selectAtPoint(clientX: number, clientY: number) {
        const centers = options.map((_, index) => {
            const option = optionRefs.current[index];
            if (!option) return null;

            const rect = option.getBoundingClientRect();
            return {
                x: (rect.left + rect.right) / 2,
                y: (rect.top + rect.bottom) / 2,
            };
        });

        const index = nearestSegmentIndex(centers, { x: clientX, y: clientY });
        if (index < 0) return;

        const nextValue = options[index].value;
        if (nextValue !== value) {
            onChange(nextValue);
        }
    }

    function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        if (disabled) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        isDraggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        selectAtPoint(event.clientX, event.clientY);
    }

    function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
        if (!isDraggingRef.current) return;

        selectAtPoint(event.clientX, event.clientY);
    }

    function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
        isDraggingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }

    return (
        <div
            className={`grid w-full touch-none select-none grid-cols-[repeat(var(--segment-count),minmax(0,1fr))] gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-neutral-900${className ? ` ${className}` : ""}`}
            role={role}
            aria-label={ariaLabel}
            style={{ "--segment-count": columns ?? options.length } as CSSProperties}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
        >
            {options.map((option, index) => (
                <button
                    key={String(option.value)}
                    ref={(element) => {
                        optionRefs.current[index] = element;
                    }}
                    type="button"
                    aria-label={option.ariaLabel}
                    aria-pressed={value === option.value}
                    title={option.title}
                    disabled={disabled}
                    onClick={(event) => {
                        // Pointer selection already ran on pointerdown/move;
                        // respond only to keyboard activation here (detail === 0)
                        // so taps and drags do not fire onChange twice or revert
                        // to the press-start segment.
                        if (event.detail !== 0) return;

                        onChange(option.value);
                    }}
                    className={`flex min-h-10 min-w-0 items-center justify-center rounded-md px-3 py-2 text-sm disabled:opacity-50 ${
                        value === option.value
                            ? "bg-white font-medium text-zinc-950 shadow-sm dark:bg-neutral-700 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                >
                    {option.content}
                </button>
            ))}
        </div>
    );
}
