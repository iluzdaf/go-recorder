"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { LocalDraftRecord } from "@/lib/localGames";
import { getAllLocalDrafts } from "@/lib/localGames";
import { GameBoardThumbnail, getDraftTitle } from "@/components/GameListItem";
import SecondaryPageShell from "@/components/SecondaryPageShell";
import SwipeDeleteRow from "@/components/SwipeDeleteRow";
import { navigateWithinApp } from "@/lib/fullscreenNavigation";
import { t } from "@/lib/i18n";
import { LOCAL_DATA_MIGRATION_CHANGE_EVENT } from "@/lib/localDataMigration";
import { deleteLocalEditableRecord } from "@/lib/localRecordDeletion";

export default function DraftsPage() {
    const router = useRouter();
    const [drafts, setDrafts] = useState<LocalDraftRecord[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [revealedDeleteId, setRevealedDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const refreshDrafts = () => {
            setDrafts(getAllLocalDrafts());
            setLoaded(true);
        };

        const timeoutId = window.setTimeout(refreshDrafts, 0);
        const handleLocalDataChange = () => {
            refreshDrafts();
        };

        window.addEventListener(
            LOCAL_DATA_MIGRATION_CHANGE_EVENT,
            handleLocalDataChange
        );

        return () => {
            window.clearTimeout(timeoutId);
            window.removeEventListener(
                LOCAL_DATA_MIGRATION_CHANGE_EVENT,
                handleLocalDataChange
            );
        };
    }, []);

    function handleDelete(id: string) {
        deleteLocalEditableRecord(id);
        setDrafts((prev) => prev.filter((d) => d.id !== id));
        setRevealedDeleteId(null);
    }

    if (!loaded) return null;

    return (
        <SecondaryPageShell title={t("drafts")}>
            {drafts.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t("noDrafts")}
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {drafts.map((draft) => (
                        <li key={draft.id}>
                            <SwipeDeleteRow
                                deleteLabel={t("deleteDraft")}
                                isRevealed={revealedDeleteId === draft.id}
                                onReveal={() => setRevealedDeleteId(draft.id)}
                                onDelete={() => handleDelete(draft.id)}
                                onActivate={() => {
                                    navigateWithinApp({
                                        path: `/drafts/${draft.id}`,
                                        push: router.push,
                                    });
                                }}
                            >
                                <GameBoardThumbnail game={draft} size={64} />
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="truncate text-base font-semibold text-zinc-950 dark:text-white">
                                        {getDraftTitle(draft)}
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {new Date(
                                            draft.updatedAt
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                <Pencil
                                    size={15}
                                    className="shrink-0 text-zinc-400 dark:text-zinc-500"
                                />
                            </SwipeDeleteRow>
                        </li>
                    ))}
                </ul>
            )}
        </SecondaryPageShell>
    );
}
