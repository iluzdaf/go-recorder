import Link from "next/link";

import { t } from "../../lib/i18n";

export const metadata = {
    title: t("privacyPolicyTitle"),
    description: t("privacyPolicyIntro"),
};

export default function PrivacyPage() {
    return (
        <main className="min-h-0 flex-1 overflow-auto bg-zinc-100 px-4 py-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
            <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-5">
                <header className="flex flex-col gap-2">
                    <h1 className="text-2xl font-semibold tracking-normal">
                        {t("privacyPolicyTitle")}
                    </h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t("privacyPolicyIntro")}
                    </p>
                </header>

                <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        What we store
                    </h2>
                    <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {t("privacyPolicyWhatWeStore")}
                    </p>
                </section>

                <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Why we store it
                    </h2>
                    <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {t("privacyPolicyWhy")}
                    </p>
                </section>

                <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Local data
                    </h2>
                    <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {t("privacyPolicyLocalData")}
                    </p>
                </section>

                <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Retention
                    </h2>
                    <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {t("privacyPolicyRetention")}
                    </p>
                </section>

                <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Questions
                    </h2>
                    <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {t("privacyPolicyContact")}
                    </p>
                </section>

                <div>
                    <Link
                        href="/"
                        className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                    >
                        {t("privacyPolicyBack")}
                    </Link>
                </div>
            </div>
        </main>
    );
}
