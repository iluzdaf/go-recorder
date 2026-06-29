"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ShareMenuMode } from "./ShareMenu";
import useShareMenu from "./useShareMenu";

type UseEditableShareMenuControllerOptions = {
    initialIsOpen?: boolean;
    initialShareSlug?: string | null;
};

export default function useEditableShareMenuController({
    initialIsOpen = false,
    initialShareSlug = null,
}: UseEditableShareMenuControllerOptions) {
    const [shareSlug, setShareSlug] = useState<string | null>(initialShareSlug);
    const [mode, setMode] = useState<ShareMenuMode>(
        initialShareSlug ? "created" : "chooser"
    );
    const [message, setMessage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const sharePath = shareSlug ? `/shares/${shareSlug}` : null;

    useEffect(() => {
        if (!statusMessage) return;
        const id = window.setTimeout(() => setStatusMessage(null), 4000);
        return () => window.clearTimeout(id);
    }, [statusMessage]);

    const resetTransientState = useCallback(() => {
        setMessage(null);
        setStatusMessage(null);
        setIsCreating(false);
    }, []);

    const {
        clearQrCode,
        close,
        copyShareLink,
        isOpen,
        menuRef,
        open: openBase,
        qrCodeDataUrl,
        triggerRef,
    } = useShareMenu({
        initialIsOpen,
        onClose: resetTransientState,
        onStatus: setStatusMessage,
        sharePath,
        shouldGenerateQrCode: mode === "created",
    });

    const resetToShareSlug = useCallback(
        (nextShareSlug: string | null) => {
            setShareSlug(nextShareSlug);
            setMode(nextShareSlug ? "created" : "chooser");
            clearQrCode();
            setMessage(null);
            setIsCreating(false);
        },
        [clearQrCode]
    );

    const clearShareLink = useCallback(() => {
        resetToShareSlug(null);
    }, [resetToShareSlug]);

    const open = useCallback(() => {
        setMode(shareSlug ? "created" : "chooser");
        openBase();
    }, [openBase, shareSlug]);

    const toggle = useCallback(() => {
        if (isOpen) {
            close();
            return;
        }

        open();
    }, [close, isOpen, open]);

    const setCreating = useCallback((nextMessage: string) => {
        setIsCreating(true);
        setMessage(nextMessage);
    }, []);

    const setError = useCallback((nextMessage: string) => {
        setIsCreating(false);
        setMessage(nextMessage);
    }, []);

    const finishCreated = useCallback(
        (nextShareSlug: string) => {
            void cacheCreatedSharePage(`/shares/${nextShareSlug}`);
            setShareSlug(nextShareSlug);
            setMode("created");
            openBase();
            clearQrCode();
            setMessage(null);
            setIsCreating(false);
        },
        [clearQrCode, openBase]
    );

    return useMemo(
        () => ({
            clearQrCode,
            clearShareLink,
            close,
            copyShareLink,
            displayMessage: statusMessage ?? message,
            finishCreated,
            isCreating,
            isOpen,
            menuRef,
            mode,
            open,
            qrCodeDataUrl,
            resetToShareSlug,
            setCreating,
            setError,
            sharePath,
            shareSlug,
            toggle,
            triggerRef,
        }),
        [
            clearQrCode,
            clearShareLink,
            close,
            copyShareLink,
            finishCreated,
            isCreating,
            isOpen,
            menuRef,
            message,
            mode,
            open,
            qrCodeDataUrl,
            resetToShareSlug,
            setCreating,
            setError,
            sharePath,
            shareSlug,
            statusMessage,
            toggle,
            triggerRef,
        ]
    );
}

async function cacheCreatedSharePage(sharePath: string) {
    if (
        typeof navigator === "undefined" ||
        !("serviceWorker" in navigator)
    ) {
        return;
    }

    try {
        await import("@/components/ShareGoBoard");
        const registration = await navigator.serviceWorker.ready;

        registration.active?.postMessage({
            type: "CACHE_SHARE_PAGE",
            sharePath,
        });
    } catch {
        // Share links still work online even if offline caching is unavailable.
    }
}
