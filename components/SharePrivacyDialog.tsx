"use client";

import Link from "next/link";

import { t } from "../lib/i18n";
import { buildSharePrivacyPolicyHref } from "../lib/sharePrivacy";

type SharePrivacyDialogProps = {
    returnToPath: string;
    onCancel: () => void;
    onReadPolicy: () => void;
    onContinue: () => void;
};

export default function SharePrivacyDialog({
    returnToPath,
    onCancel,
    onReadPolicy,
    onContinue,
}: SharePrivacyDialogProps) {
    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center"
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-privacy-title"
                className="relative z-10 w-[min(calc(100%-2rem),24rem)] rounded-lg border border-zinc-200 bg-white p-4 text-zinc-950 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            >
                <div className="space-y-3">
                    <div>
                        <h2
                            id="share-privacy-title"
                            className="text-sm font-semibold"
                        >
                            {t("sharePrivacyTitle")}
                        </h2>
                        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                            {t("sharePrivacySummary")}
                        </p>
                    </div>

                    <Link
                        href={buildSharePrivacyPolicyHref(returnToPath)}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-sm text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                        onClick={onReadPolicy}
                    >
                        {t("sharePrivacyReadPolicy")}
                    </Link>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
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
                        onClick={onContinue}
                    >
                        {t("sharePrivacyContinue")}
                    </button>
                </div>
            </div>
        </div>
    );
}
