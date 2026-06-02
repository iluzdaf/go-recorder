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

function getPlayerName(name: string | null) {
    const trimmedName = name?.trim();

    return trimmedName && trimmedName.length > 0 ? trimmedName : null;
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
                    background: "#f4f4f5",
                    color: "#18181b",
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
    const boardPixelSize = 560;
    const boardPadding = 36;
    const gridSize = boardPixelSize - boardPadding * 2;
    const gridStep = gridSize / (boardSize - 1);
    const stoneRadius = Math.max(10, gridStep * 0.42);
    const blackPlayerName = getPlayerName(share.blackPlayerName);
    const whitePlayerName = getPlayerName(share.whitePlayerName);
    const hasPlayerNames = blackPlayerName !== null || whitePlayerName !== null;
    const boardLeft = hasPlayerNames ? 80 : (size.width - boardPixelSize) / 2;
    const boardTop = (size.height - boardPixelSize) / 2;
    const lastPlayMove = getLastPlayMove(share.gameState.moves);

    return new ImageResponse(
        (
            <div
                style={{
                    background: "#f4f4f5",
                    color: "#18181b",
                    display: "flex",
                    height: "100%",
                    position: "relative",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        background: "#f4f4f5",
                        display: "flex",
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
                            <div
                                key={`line-${index}`}
                                style={{ display: "flex" }}
                            >
                                <div
                                    style={{
                                        background: "#52525b",
                                        height: 2,
                                        left: boardPadding,
                                        position: "absolute",
                                        top: offset,
                                        width: gridSize,
                                    }}
                                />
                                <div
                                    style={{
                                        background: "#52525b",
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
                                background: "#3f3f46",
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
                                        background: isBlack ? "#09090b" : "#fafafa",
                                        border: isBlack
                                            ? "1px solid #09090b"
                                            : "1px solid #18181b",
                                        borderRadius: "50%",
                                        display: "flex",
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
                                                        ? "3px solid #fafafa"
                                                        : "3px solid #09090b",
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

                {hasPlayerNames && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                            left: 700,
                            position: "absolute",
                            top: 150,
                            width: 360,
                        }}
                    >
                        {blackPlayerName && (
                            <span
                                style={{
                                    color: "#18181b",
                                    fontSize: 62,
                                    fontWeight: 800,
                                    letterSpacing: "-0.04em",
                                    lineHeight: 1,
                                }}
                            >
                                {blackPlayerName}
                            </span>
                        )}
                        {blackPlayerName && whitePlayerName && (
                            <span style={{ color: "#52525b", fontSize: 34 }}>
                                vs
                            </span>
                        )}
                        {whitePlayerName && (
                            <span
                                style={{
                                    color: "#18181b",
                                    fontSize: 62,
                                    fontWeight: 800,
                                    letterSpacing: "-0.04em",
                                    lineHeight: 1,
                                }}
                            >
                                {whitePlayerName}
                            </span>
                        )}
                    </div>
                )}
            </div>
        ),
        size
    );
}
