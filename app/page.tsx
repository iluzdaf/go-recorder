"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import type { BoardSize } from "@/components/types";
import { createLocalDraft, createLocalGame, getAllLocalDrafts, getAllLocalGames } from "@/lib/localGames";
import type { LocalDraftRecord, LocalGameRecord } from "@/lib/localGames";
import {
    createDefaultLocalBoardDraftInput,
    createLocalGameInputFromForm,
} from "@/lib/localGameSetup";
import { Grid3x3, Image as ImageIcon } from "lucide-react";
import { GameBoardThumbnail, getDraftTitle, getGameTitle } from "@/components/GameListItem";
import ImageDraftCreator from "@/components/ImageDraftCreator";
import { navigateWithinApp } from "@/lib/fullscreenNavigation";
import { t } from "@/lib/i18n";
import { loadHomeSetup, saveHomeSetup } from "@/lib/homeSetup";
import { LOCAL_DATA_MIGRATION_CHANGE_EVENT } from "@/lib/localDataMigration";

const RECENT_GAME_LIMIT = 3;

export default function Home() {
  const router = useRouter();
  const [boardSize, setBoardSize] = useState<BoardSize>(19);
  const [handicap, setHandicap] = useState(0);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [isImportingImage, setIsImportingImage] = useState(false);
  const [draftSource, setDraftSource] = useState<"blank" | "image">("blank");
  const [recentGames, setRecentGames] = useState<LocalGameRecord[]>([]);
  const [recentDrafts, setRecentDrafts] = useState<LocalDraftRecord[]>([]);
  const setupLoaded = useRef(false);

  useEffect(() => {
    const saved = loadHomeSetup();
    setBoardSize(saved.boardSize);
    setHandicap(saved.handicap);
    setDraftSource(saved.draftSource);
    setupLoaded.current = true;

    const refreshLocalData = () => {
      setRecentGames(getAllLocalGames().slice(0, RECENT_GAME_LIMIT));
      setRecentDrafts(getAllLocalDrafts().slice(0, RECENT_GAME_LIMIT));
    };

    const timeoutId = window.setTimeout(refreshLocalData, 0);
    const handleLocalDataChange = () => {
      refreshLocalData();
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

  useEffect(() => {
    if (!setupLoaded.current) return;
    saveHomeSetup({ boardSize, handicap, draftSource });
  }, [boardSize, handicap, draftSource]);

  function handleRecordGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreatingGame(true);

    const game = createLocalGame(createLocalGameInputFromForm({
        boardSize,
        blackPlayerName: "",
        whitePlayerName: "",
        handicap,
    }));

    navigateWithinApp({
        path: `/games/${game.id}`,
        push: router.push,
    });
  }

  function handleCreateDraft() {
    if (draftSource === "image") {
      setIsImportingImage(true);
      return;
    }

    setIsCreatingDraft(true);

    const draft = createLocalDraft(createDefaultLocalBoardDraftInput());

    navigateWithinApp({
        path: `/drafts/${draft.id}`,
        push: router.push,
    });
  }

  return (
    <main className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
      <div className="grid w-full max-w-3xl gap-4 mt-16 sm:grid-cols-2 sm:items-start">
        <form
          onSubmit={handleRecordGame}
          className="flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          <div className="flex flex-col gap-1">
            <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-neutral-900">
              {([9, 13, 19] as BoardSize[]).map((size) => {
                const label = `${size} × ${size}`;
                return (
                  <button
                    key={size}
                    type="button"
                    aria-label={label}
                    aria-pressed={boardSize === size}
                    disabled={isCreatingGame || isCreatingDraft}
                    onClick={() => setBoardSize(size)}
                    className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm disabled:opacity-50 ${
                      boardSize === size
                        ? "bg-white font-medium text-zinc-950 shadow-sm dark:bg-neutral-700 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

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

          {recentGames.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {t("recentGames")}
                </span>
                <button
                  type="button"
                  className="text-sm text-sky-700 hover:underline dark:text-sky-400"
                  onClick={() => {
                    navigateWithinApp({
                      path: "/games",
                      push: router.push,
                    });
                  }}
                >
                  {t("showMoreGames")}
                </button>
              </div>
              <ul className="flex flex-col">
                {recentGames.map((game) => (
                  <li key={game.id}>
                    <button
                      type="button"
                      aria-label={getGameTitle(game)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-zinc-50 dark:hover:bg-neutral-750"
                      onClick={() => {
                        navigateWithinApp({
                          path: `/games/${game.id}`,
                          push: router.push,
                        });
                      }}
                    >
                      <GameBoardThumbnail game={game} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">
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
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>

        <section className="flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-neutral-900">
            {(["blank", "image"] as const).map((source) => {
              const label =
                source === "blank"
                  ? t("draftSourceBlank")
                  : t("draftSourceImage");
              return (
                <button
                  key={source}
                  type="button"
                  aria-label={label}
                  title={label}
                  aria-pressed={draftSource === source}
                  disabled={isCreatingGame || isCreatingDraft}
                  onClick={() => setDraftSource(source)}
                  className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 disabled:opacity-50 ${
                    draftSource === source
                      ? "bg-white text-zinc-950 shadow-sm dark:bg-neutral-700 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {source === "blank" ? (
                    <Grid3x3 size={18} />
                  ) : (
                    <ImageIcon size={18} />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={isCreatingGame || isCreatingDraft}
            onClick={handleCreateDraft}
            className="rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {isCreatingDraft ? t("creatingDraft") : t("createDraft")}
          </button>

          {recentDrafts.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {t("recentDrafts")}
                </span>
                <button
                  type="button"
                  className="text-sm text-sky-700 hover:underline dark:text-sky-400"
                  onClick={() => {
                    navigateWithinApp({
                      path: "/drafts",
                      push: router.push,
                    });
                  }}
                >
                  {t("showMoreDrafts")}
                </button>
              </div>
              <ul className="flex flex-col">
                {recentDrafts.map((draft) => (
                  <li key={draft.id}>
                    <button
                      type="button"
                      aria-label={getDraftTitle(draft)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-zinc-50 dark:hover:bg-neutral-750"
                      onClick={() => {
                        navigateWithinApp({
                          path: `/drafts/${draft.id}`,
                          push: router.push,
                        });
                      }}
                    >
                      <GameBoardThumbnail game={draft} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">
                          {getDraftTitle(draft)}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(draft.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {isImportingImage && (
        <ImageDraftCreator onClose={() => setIsImportingImage(false)} />
      )}
    </main>
  );
}
