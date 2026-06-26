"use client";

import { t } from "../lib/i18n";

type ConfirmDialogProps = {
    confirmLabel: string;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
    titleId: string;
};

export default function ConfirmDialog({
    confirmLabel,
    message,
    onCancel,
    onConfirm,
    titleId,
}: ConfirmDialogProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 w-[min(calc(100%-2rem),20rem)] rounded-lg border border-zinc-200 bg-white p-3 text-zinc-950 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            >
                <p id={titleId} className="text-sm font-medium">
                    {message}
                </p>
                <div className="mt-3 flex justify-end gap-2">
                    <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-sm text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                        onClick={onCancel}
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-950 px-3 text-sm text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
