"use client";

import { useEffect } from "react";

import { t } from "../lib/i18n";

type BoardStatusMessageProps = {
    message: string | null;
    onDismiss: () => void;
    autoDismissMs?: number;
};

export default function BoardStatusMessage({
    message,
    onDismiss,
    autoDismissMs = 4000,
}: BoardStatusMessageProps) {
    useEffect(() => {
        if (!message) return;

        const timeoutId = window.setTimeout(() => {
            onDismiss();
        }, autoDismissMs);

        return () => window.clearTimeout(timeoutId);
    }, [autoDismissMs, message, onDismiss]);

    if (!message) return null;

    return (
        <div className="shrink-0 px-3 pt-3">
            <div
                className="mx-auto flex max-w-xl items-start gap-3 rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-sm text-zinc-800 shadow-lg dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-100"
                role="status"
                aria-live="polite"
            >
                <p className="min-w-0 flex-1">{message}</p>
                <button
                    type="button"
                    className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    onClick={onDismiss}
                    aria-label={t("dismissMessage")}
                >
                    ×
                </button>
            </div>
        </div>
    );
}
