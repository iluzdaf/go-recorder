"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { LocalGameRecord } from "@/lib/localGames";
import { getAllLocalGames, deleteLocalRecord } from "@/lib/localGames";
import { t } from "@/lib/i18n";

function getGameTitle(game: LocalGameRecord) {
    const black = game.blackPlayerName?.trim();
    const white = game.whitePlayerName?.trim();

    if (black && white) return `${black} vs ${white}`;
    if (black) return black;
    if (white) return white;

    return t("unnamedGame");
}

export default function GamesPage() {
    const [games, setGames] = useState<LocalGameRecord[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setGames(getAllLocalGames());
        setLoaded(true);
    }, []);

    function handleDelete(id: string) {
        deleteLocalRecord(id);
        setGames((prev) => prev.filter((g) => g.id !== id));
    }

    if (!loaded) return null;

    return (
        <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
            <h1 className="mb-4 text-lg font-semibold">{t("games")}</h1>

            {games.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t("noGames")}
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {games.map((game) => (
                        <li
                            key={game.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-300 bg-white px-5 py-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
                        >
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate font-medium">
                                    {getGameTitle(game)}
                                </span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {game.boardSize}×{game.boardSize}
                                    {" · "}
                                    {game.gameState.moves.length} {t("moves")}
                                    {" · "}
                                    {new Date(game.updatedAt).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <Link
                                    href={`/games/${game.id}`}
                                    className="rounded bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600"
                                >
                                    {t("continueRecording")}
                                </Link>
                                <button
                                    type="button"
                                    aria-label={t("deleteGame")}
                                    title={t("deleteGame")}
                                    onClick={() => handleDelete(game.id)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-neutral-700 dark:hover:text-red-400"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
