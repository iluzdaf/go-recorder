import Link from "next/link";
import { ArrowDownToLine } from "lucide-react";

import SecondaryPageShell from "../../components/SecondaryPageShell";
import { primaryActionButtonClass } from "../../lib/buttonStyles";
import { t } from "../../lib/i18n";
import { isSafeAppPath } from "../../lib/sharePrivacy";

type PrivacySearchParams = {
    from?: string | string[];
    returnTo?: string | string[];
};

type PrivacyPageProps = {
    searchParams?: Promise<PrivacySearchParams>;
};

export const metadata = {
    title: t("privacyPolicyTitle"),
    description: t("privacyPolicyIntro"),
};

function getReturnToPath(searchParams: PrivacySearchParams | undefined) {
    const rawReturnTo = searchParams?.returnTo;
    const returnToPath = Array.isArray(rawReturnTo)
        ? rawReturnTo[0]
        : rawReturnTo;

    return typeof returnToPath === "string" && isSafeAppPath(returnToPath)
        ? returnToPath
        : "/";
}

function isShareConfirmationEntry(
    searchParams: PrivacySearchParams | undefined
) {
    const rawFrom = searchParams?.from;
    const from = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom;

    return from === "share-confirmation";
}

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
    const resolvedSearchParams = (await searchParams) as
        | PrivacySearchParams
        | undefined;
    const returnToPath = getReturnToPath(resolvedSearchParams);
    const isShareConfirmationFlow =
        isShareConfirmationEntry(resolvedSearchParams);

    return (
        <SecondaryPageShell title={t("privacyPolicyTitle")}>
            <div id="privacy-policy-top" className="flex flex-col gap-5">
                <article className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="flex flex-col gap-3">
                        <p className="max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                            {t("privacyPolicyIntro")}
                        </p>
                        {isShareConfirmationFlow ? (
                            <div>
                                <a
                                    href="#privacy-policy-bottom"
                                    className={`${primaryActionButtonClass} w-10 px-0`}
                                    aria-label={t("privacyPolicyGoToBottom")}
                                    title={t("privacyPolicyGoToBottom")}
                                >
                                    <ArrowDownToLine size={18} />
                                </a>
                            </div>
                        ) : null}
                    </div>
                </article>

                <section className="space-y-3 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        What we store
                    </h2>
                    <p className="max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {t("privacyPolicyWhatWeStore")}
                    </p>
                </section>

                <section className="space-y-3 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Why we store it
                    </h2>
                    <p className="max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {t("privacyPolicyWhy")}
                    </p>
                </section>

                <section className="space-y-3 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Local data
                    </h2>
                    <p className="max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {t("privacyPolicyLocalData")}
                    </p>
                </section>

                <section className="space-y-3 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Retention
                    </h2>
                    <p className="max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {t("privacyPolicyRetention")}
                    </p>
                </section>

                <section className="space-y-3 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Questions
                    </h2>
                    <p className="max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {t("privacyPolicyContact")}
                    </p>
                </section>

                <div id="privacy-policy-bottom">
                    {isShareConfirmationFlow ? (
                        <Link
                            href={returnToPath}
                            className={primaryActionButtonClass}
                        >
                            {t("privacyPolicyBack")}
                        </Link>
                    ) : (
                        <a
                            href="#privacy-policy-top"
                            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                        >
                            {t("privacyPolicyBackToTop")}
                        </a>
                    )}
                </div>
            </div>
        </SecondaryPageShell>
    );
}
