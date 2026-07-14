"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import type { BoardSize } from "@/components/types";
import {
    createLocalDraft,
    createLocalGame,
} from "@/lib/localGames";
import type { LocalDraftRecord, LocalGameRecord } from "@/lib/localGames";
import {
    createDefaultLocalBoardDraftInput,
    createLocalGameInputFromForm,
} from "@/lib/localGameSetup";
import { Grid3x3, Image as ImageIcon } from "lucide-react";
import {
    GameBoardThumbnail,
    getDraftTitle,
    getGameTitle,
} from "@/components/GameListItem";
import ImageDraftCreator from "@/components/ImageDraftCreator";
import SegmentedControl from "@/components/SegmentedControl";
import SwipeDeleteRow from "@/components/SwipeDeleteRow";
import { navigateWithinApp } from "@/lib/fullscreenNavigation";
import { t } from "@/lib/i18n";
import { loadHomeSetup, saveHomeSetup } from "@/lib/homeSetup";
import { LOCAL_DATA_MIGRATION_CHANGE_EVENT } from "@/lib/localDataMigration";
import { deleteLocalEditableRecord } from "@/lib/localRecordDeletion";
import {
    createHomeRecentPreviews,
    createLoadingHomeRecentState,
    loadHomeRecentState,
    shouldRenderHomeRecentSection,
    type HomeRecentPreview,
} from "@/lib/homeRecent";

const HANDICAP_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const HOME_RECENT_PLACEHOLDER_COUNT = 1;

export default function Home() {
  const router = useRouter();
  const [boardSize, setBoardSize] = useState<BoardSize>(19);
  const [handicap, setHandicap] = useState(0);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [isImportingImage, setIsImportingImage] = useState(false);
  const [draftSource, setDraftSource] = useState<"blank" | "image">("blank");
  const [recentState, setRecentState] = useState(createLoadingHomeRecentState);
  const [revealedDeleteId, setRevealedDeleteId] = useState<string | null>(null);
  const setupLoaded = useRef(false);

  useEffect(() => {
    const refreshLocalData = () => {
      setRecentState(loadHomeRecentState());
    };

    const timeoutId = window.setTimeout(() => {
      const saved = loadHomeSetup();
      setBoardSize(saved.boardSize);
      setHandicap(saved.handicap);
      setDraftSource(saved.draftSource);
      setupLoaded.current = true;
      refreshLocalData();
    }, 0);
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

  const recentGamePreviews = useMemo(
    () => createHomeRecentPreviews(recentState.games, getGameTitle),
    [recentState.games]
  );
  const recentDraftPreviews = useMemo(
    () => createHomeRecentPreviews(recentState.drafts, getDraftTitle),
    [recentState.drafts]
  );

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

  function handleDeleteRecentRecord(recordId: string) {
    deleteLocalEditableRecord(recordId);
    setRevealedDeleteId(null);
    setRecentState(loadHomeRecentState());
  }

  return (
    <main className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
      <div className="grid w-full max-w-3xl gap-4 mt-16 sm:grid-cols-2 sm:items-start">
        <form
          onSubmit={handleRecordGame}
          data-testid="record-game-card"
          className="flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          <div className="flex flex-col gap-1">
            <SegmentedControl<BoardSize>
              value={boardSize}
              disabled={isCreatingGame || isCreatingDraft}
              onChange={setBoardSize}
              options={([9, 13, 19] as BoardSize[]).map((size) => ({
                value: size,
                content: `${size} × ${size}`,
                ariaLabel: `${size} × ${size}`,
              }))}
            />
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium">{t("handicap")}</legend>
            <SegmentedControl<number>
              columns={5}
              value={handicap}
              disabled={isCreatingGame || isCreatingDraft}
              onChange={setHandicap}
              options={HANDICAP_OPTIONS.map((value) => ({
                value,
                content: value,
                ariaLabel: `${t("handicap")} ${value}`,
              }))}
            />
          </fieldset>

          <button
            type="submit"
            disabled={isCreatingGame || isCreatingDraft}
            className="rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {isCreatingGame ? t("recording") : t("recordGame")}
          </button>

          {shouldRenderHomeRecentSection(recentState, recentState.games) && (
            <RecentGamesSection
              isLoading={recentState.status === "loading"}
              games={recentGamePreviews}
              onShowAll={() => {
                navigateWithinApp({
                  path: "/games",
                  push: router.push,
                });
              }}
              onOpenGame={(gameId) => {
                navigateWithinApp({
                  path: `/games/${gameId}`,
                  push: router.push,
                });
              }}
              onDeleteGame={handleDeleteRecentRecord}
              onRevealDelete={setRevealedDeleteId}
              revealedDeleteId={revealedDeleteId}
            />
          )}
        </form>

        <section
          data-testid="create-draft-card"
          className="flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          <SegmentedControl<"blank" | "image">
            value={draftSource}
            disabled={isCreatingGame || isCreatingDraft}
            onChange={setDraftSource}
            options={(["blank", "image"] as const).map((source) => {
              const label =
                source === "blank"
                  ? t("draftSourceBlank")
                  : t("draftSourceImage");
              return {
                value: source,
                ariaLabel: label,
                title: label,
                content:
                  source === "blank" ? (
                    <Grid3x3 size={18} />
                  ) : (
                    <ImageIcon size={18} />
                  ),
              };
            })}
          />

          <button
            type="button"
            disabled={isCreatingGame || isCreatingDraft}
            onClick={handleCreateDraft}
            className="rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {isCreatingDraft ? t("creatingDraft") : t("createDraft")}
          </button>

          {shouldRenderHomeRecentSection(recentState, recentState.drafts) && (
            <RecentDraftsSection
              isLoading={recentState.status === "loading"}
              drafts={recentDraftPreviews}
              onShowAll={() => {
                navigateWithinApp({
                  path: "/drafts",
                  push: router.push,
                });
              }}
              onOpenDraft={(draftId) => {
                navigateWithinApp({
                  path: `/drafts/${draftId}`,
                  push: router.push,
                });
              }}
              onDeleteDraft={handleDeleteRecentRecord}
              onRevealDelete={setRevealedDeleteId}
              revealedDeleteId={revealedDeleteId}
            />
          )}
        </section>
      </div>

      {isImportingImage && (
        <ImageDraftCreator onClose={() => setIsImportingImage(false)} />
      )}
    </main>
  );
}

function RecentGamesSection({
  games,
  isLoading,
  onDeleteGame,
  onOpenGame,
  onRevealDelete,
  onShowAll,
  revealedDeleteId,
}: {
  games: HomeRecentPreview<LocalGameRecord>[];
  isLoading: boolean;
  onDeleteGame: (gameId: string) => void;
  onOpenGame: (gameId: string) => void;
  onRevealDelete: (gameId: string) => void;
  onShowAll: () => void;
  revealedDeleteId: string | null;
}) {
  return (
    <RecentSectionFrame
      title={t("recentGames")}
      showAllLabel={t("showMoreGames")}
      isLoading={isLoading}
      testId="recent-games-section"
      onShowAll={onShowAll}
    >
      <ul className="flex flex-col">
        {games.map(({ previewKey, record: game, title }) => (
          <li key={previewKey} className="py-1">
            <SwipeDeleteRow
              deleteLabel={t("deleteGame")}
              isRevealed={revealedDeleteId === game.id}
              onReveal={() => onRevealDelete(game.id)}
              onDelete={() => onDeleteGame(game.id)}
              onActivate={() => onOpenGame(game.id)}
            >
              <GameBoardThumbnail game={game} size={56} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                  {title}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {game.boardSize}×{game.boardSize}
                  {" · "}
                  {game.gameState.moves.length} {t("moves")}
                  {" · "}
                  {new Date(game.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </SwipeDeleteRow>
          </li>
        ))}
      </ul>
    </RecentSectionFrame>
  );
}

function RecentDraftsSection({
  drafts,
  isLoading,
  onDeleteDraft,
  onOpenDraft,
  onRevealDelete,
  onShowAll,
  revealedDeleteId,
}: {
  drafts: HomeRecentPreview<LocalDraftRecord>[];
  isLoading: boolean;
  onDeleteDraft: (draftId: string) => void;
  onOpenDraft: (draftId: string) => void;
  onRevealDelete: (draftId: string) => void;
  onShowAll: () => void;
  revealedDeleteId: string | null;
}) {
  return (
    <RecentSectionFrame
      title={t("recentDrafts")}
      showAllLabel={t("showMoreDrafts")}
      isLoading={isLoading}
      testId="recent-drafts-section"
      onShowAll={onShowAll}
    >
      <ul className="flex flex-col">
        {drafts.map(({ previewKey, record: draft, title }) => (
          <li key={previewKey} className="py-1">
            <SwipeDeleteRow
              deleteLabel={t("deleteDraft")}
              isRevealed={revealedDeleteId === draft.id}
              onReveal={() => onRevealDelete(draft.id)}
              onDelete={() => onDeleteDraft(draft.id)}
              onActivate={() => onOpenDraft(draft.id)}
            >
              <GameBoardThumbnail game={draft} size={56} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                  {title}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(draft.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </SwipeDeleteRow>
          </li>
        ))}
      </ul>
    </RecentSectionFrame>
  );
}

function RecentSectionFrame({
  children,
  isLoading,
  onShowAll,
  showAllLabel,
  testId,
  title,
}: {
  children: React.ReactNode;
  isLoading: boolean;
  onShowAll: () => void;
  showAllLabel: string;
  testId: string;
  title: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-neutral-700"
      aria-busy={isLoading}
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {title}
        </span>
        <button
          type="button"
          className="text-sm text-sky-700 hover:underline dark:text-sky-400"
          onClick={onShowAll}
        >
          {showAllLabel}
        </button>
      </div>
      {isLoading ? <RecentLoadingRows /> : children}
    </div>
  );
}

function RecentLoadingRows() {
  return (
    <ul className="flex flex-col" aria-hidden>
      {Array.from({ length: HOME_RECENT_PLACEHOLDER_COUNT }, (_, index) => (
        <li key={index}>
          <div className="flex w-full items-center gap-3 rounded-lg px-3 py-3">
            <div className="h-16 w-16 shrink-0 rounded bg-zinc-200 dark:bg-neutral-700" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-neutral-700" />
              <div className="h-3 w-36 rounded bg-zinc-100 dark:bg-neutral-750" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
