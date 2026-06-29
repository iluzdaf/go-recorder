"use client";

import Link from "next/link";

import {
    primaryActionButtonClass,
    secondaryActionButtonClass,
} from "../lib/buttonStyles";
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
                        className="inline-flex text-sm font-medium text-sky-700 underline underline-offset-4 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300"
                        onClick={onReadPolicy}
                    >
                        {t("sharePrivacyReadPolicy")}
                    </Link>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        className={secondaryActionButtonClass}
                        onClick={onCancel}
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="button"
                        className={primaryActionButtonClass}
                        onClick={onContinue}
                    >
                        {t("sharePrivacyContinue")}
                    </button>
                </div>
            </div>
        </div>
    );
}
