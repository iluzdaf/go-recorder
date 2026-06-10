"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { BoardSize } from "@/components/types";
import { createLocalDraft, createLocalGame, getAllLocalGames } from "@/lib/localGames";
import type { LocalGameRecord } from "@/lib/localGames";
import {
    createDefaultLocalBoardDraftInput,
    createLocalGameInputFromForm,
} from "@/lib/localGameSetup";
import { GameBoardThumbnail, getGameTitle } from "@/components/GameListItem";
import { t } from "@/lib/i18n";

const RECENT_GAME_LIMIT = 3;

export default function Home() {
  const router = useRouter();

  const [boardSize, setBoardSize] = useState<BoardSize>(19);
  const [blackPlayerName, setBlackPlayerName] = useState("");
  const [whitePlayerName, setWhitePlayerName] = useState("");
  const [handicap, setHandicap] = useState(0);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [recentGames, setRecentGames] = useState<LocalGameRecord[]>([]);

  useEffect(() => {
    setRecentGames(getAllLocalGames().slice(0, RECENT_GAME_LIMIT));
  }, []);

  function handleRecordGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreatingGame(true);

    const game = createLocalGame(createLocalGameInputFromForm({
        boardSize,
        blackPlayerName,
        whitePlayerName,
        handicap,
    }));

    router.push(`/games/${game.id}`);
  }

  function handleCreateDraft() {
    setIsCreatingDraft(true);

    const draft = createLocalDraft(createDefaultLocalBoardDraftInput());

    router.push(`/drafts/${draft.id}`);
  }

  return (
    <main className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 sm:items-start">
        <form
          onSubmit={handleRecordGame}
          className="flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("boardSize")}</span>
            <select
              value={boardSize}
              onChange={(event) => {
                setBoardSize(Number(event.target.value) as BoardSize);
              }}
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value={9}>9 x 9</option>
              <option value={13}>13 x 13</option>
              <option value={19}>19 x 19</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("blackPlayer")}</span>
            <input
              type="text"
              value={blackPlayerName}
              onChange={(event) => {
                setBlackPlayerName(event.target.value);
              }}
              placeholder={t("blackPlayerPlaceholder")}
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("whitePlayer")}</span>
            <input
              type="text"
              value={whitePlayerName}
              onChange={(event) => {
                setWhitePlayerName(event.target.value);
              }}
              placeholder={t("whitePlayerPlaceholder")}
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("handicap")}</span>
            <select
              value={handicap}
              onChange={(event) => {
                setHandicap(Number(event.target.value));
              }}
              className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {[0, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={isCreatingGame || isCreatingDraft}
            className="rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {isCreatingGame ? t("recording") : t("recordGame")}
          </button>
        </form>

        <section className="flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          <button
            type="button"
            disabled={isCreatingGame || isCreatingDraft}
            onClick={handleCreateDraft}
            className="rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {isCreatingDraft ? t("creatingDraft") : t("createDraft")}
          </button>
        </section>

        {recentGames.length > 0 && (
          <section className="flex flex-col gap-3 sm:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                {t("recentGames")}
              </h2>
              <Link
                href="/games"
                className="text-sm text-sky-700 hover:underline dark:text-sky-400"
              >
                {t("showMoreGames")}
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {recentGames.map((game) => (
                <li key={game.id}>
                  <Link
                    href={`/games/${game.id}`}
                    aria-label={getGameTitle(game)}
                    className="flex items-center gap-3 overflow-hidden rounded-xl border border-zinc-300 bg-white px-4 py-3 shadow-sm hover:bg-zinc-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-750"
                  >
                    <GameBoardThumbnail game={game} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
