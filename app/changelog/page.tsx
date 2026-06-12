import ChangelogReleaseList from "../../components/ChangelogReleaseList";
import { t } from "../../lib/i18n";

export default function ChangelogPage() {
    return (
        <main className="min-h-0 flex-1 overflow-auto bg-zinc-100 px-4 py-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
            <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-5">
                <header className="flex flex-col gap-2">
                    <h1 className="text-2xl font-semibold tracking-normal">
                        {t("changelog")}
                    </h1>
                </header>

                <ChangelogReleaseList />
            </div>
        </main>
    );
}
