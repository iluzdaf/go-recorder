"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import type { LocalGameRecord } from "@/lib/localGames";
import { getAllLocalGames, deleteLocalRecord } from "@/lib/localGames";
import { getFinalPositionFromGameState } from "@/lib/shareFinalPosition";
import { t } from "@/lib/i18n";

const THUMB_SIZE = 80;
const THUMB_PAD = 5;

function getStarPoints(boardSize: number): [number, number][] {
    if (boardSize === 19) {
        return [3, 9, 15].flatMap((x) =>
            [3, 9, 15].map<[number, number]>((y) => [x, y])
        );
    }
    if (boardSize === 13) {
        return [3, 6, 9].flatMap((x) =>
            [3, 6, 9].map<[number, number]>((y) => [x, y])
        );
    }
    return [2, 4, 6].flatMap((x) =>
        [2, 4, 6].map<[number, number]>((y) => [x, y])
    );
}

function BoardThumbnail({ game }: { game: LocalGameRecord }) {
    const n = game.boardSize;
    const gridSize = THUMB_SIZE - THUMB_PAD * 2;
    const step = gridSize / (n - 1);
    const stoneR = Math.max(1.5, step * 0.44);

    const result = getFinalPositionFromGameState({
        boardSize: n,
        gameState: game.gameState,
    });
    const signMap = result.ok ? result.finalPosition : null;

    return (
        <svg
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            className="shrink-0 rounded"
            aria-hidden
        >
            <rect width={THUMB_SIZE} height={THUMB_SIZE} className="fill-zinc-200 dark:fill-neutral-700" rx={4} />
            {Array.from({ length: n }, (_, i) => (
                <line
                    key={`h${i}`}
                    x1={THUMB_PAD}
                    y1={THUMB_PAD + i * step}
                    x2={THUMB_PAD + gridSize}
                    y2={THUMB_PAD + i * step}
                    className="stroke-zinc-500 dark:stroke-zinc-400"
                    strokeWidth={0.5}
                />
            ))}
            {Array.from({ length: n }, (_, i) => (
                <line
                    key={`v${i}`}
                    x1={THUMB_PAD + i * step}
                    y1={THUMB_PAD}
                    x2={THUMB_PAD + i * step}
                    y2={THUMB_PAD + gridSize}
                    className="stroke-zinc-500 dark:stroke-zinc-400"
                    strokeWidth={0.5}
                />
            ))}
            {getStarPoints(n).map(([x, y]) => (
                <circle
                    key={`star-${x}-${y}`}
                    cx={THUMB_PAD + x * step}
                    cy={THUMB_PAD + y * step}
                    r={1.2}
                    className="fill-zinc-500 dark:fill-zinc-400"
                />
            ))}
            {signMap?.flatMap((row, y) =>
                row.map((sign, x) => {
                    if (sign === 0) return null;
                    const isBlack = sign === 1;
                    return (
                        <circle
                            key={`s-${x}-${y}`}
                            cx={THUMB_PAD + x * step}
                            cy={THUMB_PAD + y * step}
                            r={stoneR}
                            className={
                                isBlack
                                    ? "fill-zinc-900 dark:fill-zinc-950"
                                    : "fill-white stroke-zinc-800 dark:stroke-zinc-300"
                            }
                            strokeWidth={isBlack ? 0 : 0.5}
                        />
                    );
                })
            )}
        </svg>
    );
}

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
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    useEffect(() => {
        setGames(getAllLocalGames());
        setLoaded(true);
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
                            className="flex items-stretch overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
                        >
                            <Link
                                href={`/games/${game.id}`}
                                aria-label={`${t("editGame")}: ${getGameTitle(game)}`}
                                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-neutral-750"
                            >
                                <BoardThumbnail game={game} />
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
                            </Link>
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
