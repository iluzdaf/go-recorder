import { changelog } from "../lib/changelog";

export default function ChangelogReleaseList({
    limit,
}: Readonly<{
    limit?: number;
}> = {}) {
    const releases =
        typeof limit === "number" ? changelog.slice(0, limit) : changelog;

    return (
        <div className="flex flex-col gap-4">
            {releases.map((release) => (
                <article
                    key={release.version}
                    className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
                >
                    <div className="flex flex-col gap-1">
                        <blockquote className="text-lg font-medium leading-relaxed">
                            &ldquo;{release.title}&rdquo;
                        </blockquote>
                        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                            <span>{`v${release.version}`}</span>
                            <span aria-hidden="true">/</span>
                            <time dateTime={release.date}>{release.date}</time>
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
    );
}
