import ChangelogReleaseList from "../../components/ChangelogReleaseList";
import { t } from "../../lib/i18n";

export default function ChangelogPage() {
    return (
        <main className="min-h-0 flex-1 overflow-auto bg-zinc-100 px-4 py-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
                <header className="flex flex-col gap-3">
                    <h1 className="sr-only">{t("changelog")}</h1>
                </header>

                <ChangelogReleaseList />
            </div>
        </main>
    );
}
