"use client";

import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import {
    clampActionBarDragX,
    getActionBarAnchorFromBounds,
    type ActionBarAnchor,
} from "../lib/actionBarDrag";

type ActionBarDragState = {
    pointerId: number;
    grabOffsetX: number;
};

type UseActionBarDragOptions = {
    initialAnchor?: ActionBarAnchor | (() => ActionBarAnchor);
    onAnchorChange?: (anchor: ActionBarAnchor) => void;
};

export default function useActionBarDrag({
    initialAnchor = "left",
    onAnchorChange,
}: UseActionBarDragOptions = {}) {
    const dragRef = useRef<ActionBarDragState | null>(null);
    const railRef = useRef<HTMLDivElement | null>(null);
    const [anchor, setAnchor] = useState<ActionBarAnchor>(initialAnchor);
    const [dragX, setDragX] = useState<number | null>(null);

    const setNextAnchor = useCallback(
        (nextAnchor: ActionBarAnchor) => {
            setAnchor(nextAnchor);
            onAnchorChange?.(nextAnchor);
        },
        [onAnchorChange]
    );

    const handlePointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (
                event.target instanceof HTMLElement &&
                event.target.closest("button")
            ) {
                return;
            }

            const rail = railRef.current;
            if (!rail) return;

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);

            const barRect = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!barRect) return;

            const railRect = rail.getBoundingClientRect();
            dragRef.current = {
                pointerId: event.pointerId,
                grabOffsetX: event.clientX - barRect.left,
            };

            setDragX(
                clampActionBarDragX({
                    barWidth: barRect.width,
                    railWidth: railRect.width,
                    x: barRect.left - railRect.left,
                })
            );
        },
        []
    );

    const handlePointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const dragState = dragRef.current;

            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            event.preventDefault();

            const rail = railRef.current;
            if (!rail) return;

            const railRect = rail.getBoundingClientRect();
            const barRect = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!barRect) return;

            setDragX(
                clampActionBarDragX({
                    barWidth: barRect.width,
                    railWidth: railRect.width,
                    x: event.clientX - railRect.left - dragState.grabOffsetX,
                })
            );
        },
        []
    );

    const clearDragState = useCallback(
        (container: HTMLDivElement, pointerId: number) => {
            const dragState = dragRef.current;

            if (container.hasPointerCapture(pointerId)) {
                container.releasePointerCapture(pointerId);
            }

            if (dragState?.pointerId === pointerId) {
                dragRef.current = null;
            }
        },
        []
    );

    const finishDrag = useCallback(
        (container: HTMLDivElement, pointerId: number) => {
            clearDragState(container, pointerId);
            setDragX(null);
        },
        [clearDragState]
    );

    const handlePointerUp = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const dragState = dragRef.current;

            if (!dragState || dragState.pointerId !== event.pointerId) return;

            event.preventDefault();

            const rail = railRef.current;
            if (!rail) {
                finishDrag(event.currentTarget, event.pointerId);
                return;
            }

            const barRect = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!barRect) {
                finishDrag(event.currentTarget, event.pointerId);
                return;
            }

            const railRect = rail.getBoundingClientRect();
            const nextAnchor = getActionBarAnchorFromBounds({
                bar: barRect,
                currentAnchor: anchor,
                rail: railRect,
            });

            setNextAnchor(nextAnchor);
            finishDrag(event.currentTarget, event.pointerId);
        },
        [anchor, finishDrag, setNextAnchor]
    );

    const handlePointerCancel = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (dragRef.current?.pointerId !== event.pointerId) return;

            finishDrag(event.currentTarget, event.pointerId);
        },
        [finishDrag]
    );

    return {
        anchor,
        dragHandlers: {
            onLostPointerCapture: handlePointerCancel,
            onPointerCancel: handlePointerCancel,
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
        },
        dragX,
        railRef,
    };
}
