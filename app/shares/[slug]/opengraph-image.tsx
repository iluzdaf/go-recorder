import { ImageResponse } from "next/og";

import type { Move } from "../../../components/types";
import { replayGame } from "../../../lib/gameReplay";
import { mapShareRowToShareRecord } from "../../../lib/shareView";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export const alt = "Shared Go game final position";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

type ImageProps = {
    params: Promise<{
        slug: string;
    }>;
};

function getLastPlayMove(moves: Move[]) {
    return [...moves].reverse().find((move) => move.type === "play") ?? null;
}

function getPlayerName(name: string | null, fallback: string) {
    const trimmedName = name?.trim();

    return trimmedName && trimmedName.length > 0 ? trimmedName : fallback;
}

function getStarPoints(boardSize: number) {
    if (boardSize === 19) {
        return [3, 9, 15].flatMap((x) => [3, 9, 15].map((y) => [x, y]));
    }

    if (boardSize === 13) {
        return [3, 6, 9].flatMap((x) => [3, 6, 9].map((y) => [x, y]));
    }

    return [2, 4, 6].flatMap((x) => [2, 4, 6].map((y) => [x, y]));
}

function renderFallbackImage(message: string) {
    return new ImageResponse(
        (
            <div
                style={{
                    alignItems: "center",
                    background: "#f4e0aa",
                    color: "#1f1304",
                    display: "flex",
                    fontSize: 54,
                    fontWeight: 700,
                    height: "100%",
                    justifyContent: "center",
                    padding: 64,
                    textAlign: "center",
                    width: "100%",
                }}
            >
                {message}
            </div>
        ),
        size
    );
}

export default async function Image({ params }: ImageProps) {
    const { slug } = await params;

    const { data, error } = await supabaseAdmin
        .from("shares")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        return renderFallbackImage("Unable to render this game position.");
    }

    if (!data) {
        return new Response("Share not found", { status: 404 });
    }

    const share = mapShareRowToShareRecord(data);
    const replay = replayGame({
        boardSize: share.boardSize,
        setupStones: share.gameState.setupStones,
        moves: share.gameState.moves,
    });

    if (!replay.legal) {
        return renderFallbackImage("Unable to render this game position.");
    }

    const boardSize = share.boardSize;
    const boardPixelSize = 520;
    const boardPadding = 34;
    const gridSize = boardPixelSize - boardPadding * 2;
    const gridStep = gridSize / (boardSize - 1);
    const stoneRadius = Math.max(10, gridStep * 0.42);
    const boardLeft = 84;
    const boardTop = 55;
    const lastPlayMove = getLastPlayMove(share.gameState.moves);
    const moveCount = share.gameState.moves.length;
    const blackPlayerName = getPlayerName(share.blackPlayerName, "Black");
    const whitePlayerName = getPlayerName(share.whitePlayerName, "White");

    return new ImageResponse(
        (
            <div
                style={{
                    background: "#f5e4b8",
                    color: "#1f1304",
                    display: "flex",
                    height: "100%",
                    position: "relative",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        background: "#d7a44f",
                        border: "3px solid #6f4617",
                        borderRadius: 20,
                        boxShadow: "0 22px 44px rgba(31, 19, 4, 0.28)",
                        height: boardPixelSize,
                        left: boardLeft,
                        position: "absolute",
                        top: boardTop,
                        width: boardPixelSize,
                    }}
                >
                    {Array.from({ length: boardSize }, (_, index) => {
                        const offset = boardPadding + index * gridStep;

                        return (
                            <div key={`line-${index}`}>
                                <div
                                    style={{
                                        background: "#5f3910",
                                        height: 2,
                                        left: boardPadding,
                                        position: "absolute",
                                        top: offset,
                                        width: gridSize,
                                    }}
                                />
                                <div
                                    style={{
                                        background: "#5f3910",
                                        height: gridSize,
                                        left: offset,
                                        position: "absolute",
                                        top: boardPadding,
                                        width: 2,
                                    }}
                                />
                            </div>
                        );
                    })}

                    {getStarPoints(boardSize).map(([x, y]) => (
                        <div
                            key={`star-${x}-${y}`}
                            style={{
                                background: "#5f3910",
                                borderRadius: "50%",
                                height: 8,
                                left: boardPadding + x * gridStep - 4,
                                position: "absolute",
                                top: boardPadding + y * gridStep - 4,
                                width: 8,
                            }}
                        />
                    ))}

                    {replay.board.signMap.flatMap((row, y) =>
                        row.map((sign, x) => {
                            if (sign === 0) return null;

                            const isBlack = sign === 1;
                            const left = boardPadding + x * gridStep - stoneRadius;
                            const top = boardPadding + y * gridStep - stoneRadius;

                            return (
                                <div
                                    key={`stone-${x}-${y}`}
                                    style={{
                                        background: isBlack ? "#151515" : "#f8f4eb",
                                        border: isBlack
                                            ? "1px solid #050505"
                                            : "1px solid #a8926c",
                                        borderRadius: "50%",
                                        boxShadow: isBlack
                                            ? "inset 8px 10px 12px rgba(255, 255, 255, 0.12), 0 3px 5px rgba(0, 0, 0, 0.35)"
                                            : "inset -8px -10px 12px rgba(0, 0, 0, 0.12), 0 3px 5px rgba(0, 0, 0, 0.28)",
                                        height: stoneRadius * 2,
                                        left,
                                        position: "absolute",
                                        top,
                                        width: stoneRadius * 2,
                                    }}
                                >
                                    {lastPlayMove?.type === "play" &&
                                        lastPlayMove.x === x &&
                                        lastPlayMove.y === y && (
                                            <div
                                                style={{
                                                    border: isBlack
                                                        ? "3px solid #f8f4eb"
                                                        : "3px solid #151515",
                                                    borderRadius: "50%",
                                                    height: stoneRadius * 0.9,
                                                    left: stoneRadius * 0.55,
                                                    position: "absolute",
                                                    top: stoneRadius * 0.55,
                                                    width: stoneRadius * 0.9,
                                                }}
                                            />
                                        )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 28,
                        left: 665,
                        position: "absolute",
                        top: 84,
                        width: 420,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            fontSize: 62,
                            fontWeight: 800,
                            letterSpacing: "-0.04em",
                            lineHeight: 1,
                        }}
                    >
                        <span>{blackPlayerName}</span>
                        <span style={{ color: "#7c4d16", fontSize: 38 }}>vs</span>
                        <span>{whitePlayerName}</span>
                    </div>

                    <div
                        style={{
                            background: "rgba(255, 255, 255, 0.38)",
                            border: "2px solid rgba(111, 70, 23, 0.24)",
                            borderRadius: 24,
                            display: "flex",
                            flexDirection: "column",
                            fontSize: 36,
                            fontWeight: 700,
                            gap: 12,
                            padding: "24px 28px",
                        }}
                    >
                        <span>{boardSize}×{boardSize} board</span>
                        <span>{moveCount} moves</span>
                    </div>
                </div>
            </div>
        ),
        size
    );
}
