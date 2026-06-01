import { changelog } from "../../lib/changelog";
import { t } from "../../lib/i18n";

export default function ChangelogPage() {
    return (
        <main className="min-h-0 flex-1 overflow-auto bg-zinc-100 px-4 py-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
                <header className="flex flex-col gap-3">
                    <h1 className="sr-only">{t("changelog")}</h1>
                </header>

                <div className="flex flex-col gap-4">
                    {changelog.map((release) => (
                        <article
                            key={release.version}
                            className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
                        >
                            <div className="flex flex-col gap-1">
                                <blockquote className="text-lg font-medium leading-relaxed">
                                    &ldquo;{release.title}&rdquo;
                                </blockquote>
                                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                                    <span>
                                        {`v${release.version}`}
                                    </span>
                                    <span aria-hidden="true">/</span>
                                    <time dateTime={release.date}>
                                        {release.date}
                                    </time>
                                </div>
                            </div>

                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                                {release.items.map((entry) => (
                                    <li key={entry.id}>{entry.text}</li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </div>
        </main>
    );
}
