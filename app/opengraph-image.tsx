import { ImageResponse } from "next/og";

import { t } from "../lib/i18n";

// Branded link-preview image for the app itself (homepage and any route without
// its own opengraph-image). Mirrors the app icon: dark board theme with the
// classic 8-stone windmill (kazaguruma) beside the wordmark.
export const alt = t("appTitle");
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

const PAGE_BG = "#0a0a0a";
const BOARD_BG = "#60606a";
const GRID = "#a1a1aa";
const BLACK_STONE = "#09090b";
const WHITE_STONE = "#fafafa";
const STONE_BORDER = "#18181b";
const TITLE = "#ededed";
const SUBTITLE = "#a1a1aa";

const MOTIF = size.height; // square board motif on the left
const LINE_T = 8;
const STONE_R = Math.round(0.088 * MOTIF);
const BORDER_T = Math.round(0.02 * MOTIF);

// Windmill columns/rows 1..4 (centred, spacing 0.2), plus edge lines so the grid
// fills the tile.
const F = [0.2, 0.4, 0.6, 0.8];
const GRID_FRACS = [0, ...F, 1];
// Four 2-stone arms pinwheel around the centre: black arms vertical, white arms
// horizontal.
const STONES: Array<{ x: number; y: number; black: boolean }> = [
    { x: F[1], y: F[0], black: true },
    { x: F[1], y: F[1], black: true },
    { x: F[2], y: F[2], black: true },
    { x: F[2], y: F[3], black: true },
    { x: F[2], y: F[1], black: false },
    { x: F[3], y: F[1], black: false },
    { x: F[0], y: F[2], black: false },
    { x: F[1], y: F[2], black: false },
];

function dot(
    cx: number,
    cy: number,
    r: number,
    style: Record<string, unknown>,
    key?: number
) {
    return (
        <div
            key={key}
            style={{
                position: "absolute",
                left: cx - r,
                top: cy - r,
                width: r * 2,
                height: r * 2,
                borderRadius: "50%",
                ...style,
            }}
        />
    );
}

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    display: "flex",
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    background: PAGE_BG,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: MOTIF,
                        height: MOTIF,
                        background: BOARD_BG,
                    }}
                >
                    {GRID_FRACS.map((f) => (
                        <div
                            key={`v-${f}`}
                            style={{
                                position: "absolute",
                                left: Math.round(f * MOTIF) - LINE_T / 2,
                                top: 0,
                                width: LINE_T,
                                height: MOTIF,
                                background: GRID,
                            }}
                        />
                    ))}
                    {GRID_FRACS.map((f) => (
                        <div
                            key={`h-${f}`}
                            style={{
                                position: "absolute",
                                top: Math.round(f * MOTIF) - LINE_T / 2,
                                left: 0,
                                height: LINE_T,
                                width: MOTIF,
                                background: GRID,
                            }}
                        />
                    ))}
                    {STONES.map((stone, index) =>
                        dot(
                            stone.x * MOTIF,
                            stone.y * MOTIF,
                            STONE_R,
                            stone.black
                                ? { background: BLACK_STONE }
                                : {
                                      background: WHITE_STONE,
                                      border: `${BORDER_T}px solid ${STONE_BORDER}`,
                                  },
                            index
                        )
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        position: "absolute",
                        left: MOTIF,
                        top: 0,
                        width: size.width - MOTIF,
                        height: size.height,
                        padding: "0 64px",
                    }}
                >
                    <div
                        style={{
                            fontSize: 84,
                            fontWeight: 800,
                            color: TITLE,
                            lineHeight: 1.05,
                        }}
                    >
                        {t("appTitle")}
                    </div>
                    <div
                        style={{
                            marginTop: 20,
                            fontSize: 34,
                            fontWeight: 500,
                            color: SUBTITLE,
                            lineHeight: 1.3,
                        }}
                    >
                        {t("appDescription")}
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
