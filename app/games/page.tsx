"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import type { LocalGameRecord } from "@/lib/localGames";
import { getAllLocalGames, deleteLocalRecord } from "@/lib/localGames";
import { GameBoardThumbnail, getGameTitle } from "@/components/GameListItem";
import { navigateWithinApp } from "@/lib/fullscreenNavigation";
import { t } from "@/lib/i18n";
import { LOCAL_DATA_MIGRATION_CHANGE_EVENT } from "@/lib/localDataMigration";

export default function GamesPage() {
    const router = useRouter();
    const [games, setGames] = useState<LocalGameRecord[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

    function handleDeleteRequest(id: string) {
        setPendingDeleteId(id);
    }

    function handleDeleteConfirm(id: string) {
        deleteLocalRecord(id);
        setGames((prev) => prev.filter((g) => g.id !== id));
        setPendingDeleteId(null);
    }

    function handleDeleteCancel() {
        setPendingDeleteId(null);
    }

    if (!loaded) return null;

    return (
        <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
            <h1 className="mb-4 text-lg font-semibold text-right">{t("games")}</h1>

            {games.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t("noGames")}
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {games.map((game) => (
                        <li
                            key={game.id}
                            className="flex items-stretch overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
                        >
                            <button
                                type="button"
                                aria-label={`${t("editGame")}: ${getGameTitle(game)}`}
                                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-neutral-750"
                                onClick={() => {
                                    navigateWithinApp({
                                        path: `/games/${game.id}`,
                                        push: router.push,
                                    });
                                }}
                            >
                                <GameBoardThumbnail game={game} />
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="truncate font-medium">
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
                            </button>
                            <div className="flex items-center border-l border-zinc-200 px-2 dark:border-neutral-700">
                                {pendingDeleteId === game.id ? (
                                    <>
                                        <button
                                            type="button"
                                            aria-label={t("confirmDelete")}
                                            title={t("confirmDelete")}
                                            onClick={() => handleDeleteConfirm(game.id)}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={t("cancelDelete")}
                                            title={t("cancelDelete")}
                                            onClick={handleDeleteCancel}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-neutral-700"
                                        >
                                            <X size={15} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        aria-label={t("deleteGame")}
                                        title={t("deleteGame")}
                                        onClick={() => handleDeleteRequest(game.id)}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-neutral-700 dark:hover:text-red-400"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
