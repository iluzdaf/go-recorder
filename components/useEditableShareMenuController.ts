"use client";

import { useCallback, useMemo, useState } from "react";

import { shouldAutoCreateShare } from "../lib/shareMenu";
import type { ShareMenuMode } from "./ShareMenu";
import useShareMenu from "./useShareMenu";

type UseEditableShareMenuControllerOptions = {
    canAutoCreate?: boolean;
    initialShareSlug?: string | null;
    onStatus: (status: string) => void;
};

export default function useEditableShareMenuController({
    canAutoCreate = true,
    initialShareSlug = null,
    onStatus,
}: UseEditableShareMenuControllerOptions) {
    const [shareSlug, setShareSlug] = useState<string | null>(initialShareSlug);
    const [mode, setMode] = useState<ShareMenuMode>(
        initialShareSlug ? "created" : "chooser"
    );
    const [message, setMessage] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [hasAutoCreateAttempted, setHasAutoCreateAttempted] = useState(false);
    const sharePath = shareSlug ? `/shares/${shareSlug}` : null;

    const resetTransientState = useCallback(() => {
        setHasAutoCreateAttempted(false);
        setMessage(null);
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
        onClose: resetTransientState,
        onStatus,
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
            setHasAutoCreateAttempted(false);
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
            setShareSlug(nextShareSlug);
            setMode("created");
            openBase();
            clearQrCode();
            setMessage(null);
            setIsCreating(false);
        },
        [clearQrCode, openBase]
    );

    const canAutoCreateNow = shouldAutoCreateShare({
        canAutoCreate,
        hasAttempted: hasAutoCreateAttempted,
        isOpen,
        mode,
        sharePath,
    });

    const markAutoCreateAttempted = useCallback(() => {
        setHasAutoCreateAttempted(true);
    }, []);

    return useMemo(
        () => ({
            canAutoCreateNow,
            clearQrCode,
            clearShareLink,
            close,
            copyShareLink,
            finishCreated,
            isCreating,
            isOpen,
            markAutoCreateAttempted,
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
            toggle,
            triggerRef,
        }),
        [
            canAutoCreateNow,
            clearQrCode,
            clearShareLink,
            close,
            copyShareLink,
            finishCreated,
            isCreating,
            isOpen,
            markAutoCreateAttempted,
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
            toggle,
            triggerRef,
        ]
    );
}
