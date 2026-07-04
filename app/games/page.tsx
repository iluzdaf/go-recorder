"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { LocalGameRecord } from "@/lib/localGames";
import { getAllLocalGames } from "@/lib/localGames";
import { GameBoardThumbnail, getGameTitle } from "@/components/GameListItem";
import SecondaryPageShell from "@/components/SecondaryPageShell";
import SwipeDeleteRow from "@/components/SwipeDeleteRow";
import { navigateWithinApp } from "@/lib/fullscreenNavigation";
import { t } from "@/lib/i18n";
import { LOCAL_DATA_MIGRATION_CHANGE_EVENT } from "@/lib/localDataMigration";
import { deleteLocalEditableRecord } from "@/lib/localRecordDeletion";

export default function GamesPage() {
    const router = useRouter();
    const [games, setGames] = useState<LocalGameRecord[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [revealedDeleteId, setRevealedDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const refreshGames = () => {
            setGames(getAllLocalGames());
            setLoaded(true);
        };

        const timeoutId = window.setTimeout(refreshGames, 0);
        const handleLocalDataChange = () => {
            refreshGames();
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
        setGames((prev) => prev.filter((g) => g.id !== id));
        setRevealedDeleteId(null);
    }

    if (!loaded) return null;

    return (
        <SecondaryPageShell title={t("games")}>
            {games.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t("noGames")}
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {games.map((game) => (
                        <li key={game.id}>
                            <SwipeDeleteRow
                                deleteLabel={t("deleteGame")}
                                isRevealed={revealedDeleteId === game.id}
                                onReveal={() => setRevealedDeleteId(game.id)}
                                onDelete={() => handleDelete(game.id)}
                                onActivate={() => {
                                    navigateWithinApp({
                                        path: `/games/${game.id}`,
                                        push: router.push,
                                    });
                                }}
                            >
                                <GameBoardThumbnail game={game} size={64} />
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="truncate text-base font-semibold text-zinc-950 dark:text-white">
                                        {getGameTitle(game)}
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {game.boardSize}×{game.boardSize}
                                        {" · "}
                                        {game.gameState.moves.length}{" "}
                                        {t("moves")}
                                        {" · "}
                                        {new Date(
                                            game.updatedAt
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
