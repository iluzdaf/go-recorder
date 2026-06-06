"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import { t } from "../lib/i18n";

type UseShareMenuOptions = {
    onClose?: () => void;
    onStatus: (status: string) => void;
    sharePath: string | null;
    shouldGenerateQrCode?: boolean;
};

export default function useShareMenu({
    onClose,
    onStatus,
    sharePath,
    shouldGenerateQrCode = true,
}: UseShareMenuOptions) {
    const menuRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

    const clearQrCode = useCallback(() => {
        setQrCodeDataUrl(null);
    }, []);

    const open = useCallback(() => {
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        onClose?.();
        setIsOpen(false);
        clearQrCode();
    }, [clearQrCode, onClose]);

    const toggle = useCallback(() => {
        if (isOpen) {
            close();
            return;
        }

        open();
    }, [close, isOpen, open]);

    const copyShareLink = useCallback(async () => {
        if (!sharePath) return;

        try {
            await navigator.clipboard.writeText(
                `${window.location.origin}${sharePath}`
            );
            onStatus(t("linkCopied"));
        } catch {
            onStatus(t("failedToCopyLink"));
        }
    }, [onStatus, sharePath]);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;

            const menuElement = menuRef.current;
            const triggerElement = triggerRef.current;

            if (
                menuElement?.contains(target) ||
                triggerElement?.contains(target)
            ) {
                return;
            }

            close();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                close();
            }
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [close, isOpen]);

    useEffect(() => {
        if (!isOpen || !shouldGenerateQrCode || !sharePath) {
            return;
        }

        let cancelled = false;
        const shareUrl = `${window.location.origin}${sharePath}`;

        void QRCode.toDataURL(shareUrl, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 240,
        })
            .then((nextQrCodeDataUrl: string) => {
                if (!cancelled) {
                    setQrCodeDataUrl(nextQrCodeDataUrl);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setQrCodeDataUrl(null);
                    onStatus(t("failedToGenerateQrCode"));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, onStatus, sharePath, shouldGenerateQrCode]);

    return {
        clearQrCode,
        close,
        copyShareLink,
        isOpen,
        menuRef,
        open,
        qrCodeDataUrl,
        toggle,
        triggerRef,
    };
}
