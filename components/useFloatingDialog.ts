"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { shouldCloseFloatingDialogOnPointerDown } from "../lib/floatingDialog";

export default function useFloatingDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const dialogRef = useRef<HTMLDivElement | null>(null);

    const close = useCallback(() => setIsOpen(false), []);

    const toggle = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;

            if (
                shouldCloseFloatingDialogOnPointerDown({
                    target,
                    dialogEl: dialogRef.current,
                    triggerEl: triggerRef.current,
                })
            ) {
                close();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [close, isOpen]);

    return { close, dialogRef, isOpen, toggle, triggerRef };
}
