"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BoardSize } from "@/components/types";
import { createLocalGame } from "@/lib/localGames";
import { createLocalGameInputFromForm } from "@/lib/localGameSetup";

export default function Home() {
  const router = useRouter();

  const [boardSize, setBoardSize] = useState<BoardSize>(19);
  const [blackPlayerName, setBlackPlayerName] = useState("");
  const [whitePlayerName, setWhitePlayerName] = useState("");
  const [handicap, setHandicap] = useState(0);
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Board Size</span>
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
          <span className="text-sm font-medium">Black Player</span>
          <input
            type="text"
            value={blackPlayerName}
            onChange={(event) => {
              setBlackPlayerName(event.target.value);
            }}
            placeholder="Black"
            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">White Player</span>
          <input
            type="text"
            value={whitePlayerName}
            onChange={(event) => {
              setWhitePlayerName(event.target.value);
            }}
            placeholder="White"
            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Handicap</span>
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
          disabled={isCreatingGame}
          className="rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {isCreatingGame ? "Recording..." : "Record Game"}
        </button>
      </form>
    </main>
  );
}
