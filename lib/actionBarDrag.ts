export type ActionBarAnchor = "left" | "right";

type HorizontalBounds = {
    left: number;
    right: number;
};

type RailBounds = {
    left: number;
    width: number;
};

export function isActionBarAnchor(value: string | null): value is ActionBarAnchor {
    return value === "left" || value === "right";
}

export function clampActionBarDragX({
    barWidth,
    railWidth,
    x,
}: {
    barWidth: number;
    railWidth: number;
    x: number;
}) {
    return Math.max(0, Math.min(x, Math.max(0, railWidth - barWidth)));
}

export function getActionBarAnchorFromBounds({
    bar,
    currentAnchor,
    rail,
}: {
    bar: HorizontalBounds;
    currentAnchor: ActionBarAnchor;
    rail: RailBounds;
}): ActionBarAnchor {
    const midpointX = rail.left + rail.width / 2;

    if (currentAnchor === "left" && bar.right > midpointX) {
        return "right";
    }

    if (currentAnchor === "right" && bar.left < midpointX) {
        return "left";
    }

    return currentAnchor;
}
