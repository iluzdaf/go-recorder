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
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 w-full max-w-xl -translate-x-1/2 -translate-y-1/2">
            <div
                className="flex min-w-0 items-start gap-3 rounded-lg border border-zinc-200 bg-white/95 px-3 py-1.5 text-sm text-zinc-800 shadow-lg dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-100"
                role="status"
                aria-live="polite"
            >
                <p className="min-w-0 flex-1 whitespace-normal break-words">
                    {message}
                </p>
                <button
                    type="button"
                    className="pointer-events-auto -mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    onClick={onDismiss}
                    aria-label={t("dismissMessage")}
                >
                    ×
                </button>
            </div>
        </div>
    );
}
