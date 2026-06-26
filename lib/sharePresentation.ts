import type { DraftKind, ShareSourceKind } from "../components/types";

type SharePresentationInput = {
    blackPlayerName: string | null;
    draftKind?: DraftKind | null;
    sourceKind: ShareSourceKind;
    whitePlayerName: string | null;
};

export function getDisplayPlayerName(name: string | null) {
    const trimmedName = name?.trim();

    return trimmedName && trimmedName.length > 0 ? trimmedName : null;
}

function getGenericShareTitle({
    draftKind,
    sourceKind,
}: {
    draftKind?: DraftKind | null;
    sourceKind: ShareSourceKind;
}) {
    if (sourceKind === "draft" && draftKind === "variation") {
        return "Shared Go variation";
    }

    if (sourceKind === "draft") {
        return "Shared Go position";
    }

    return "Shared Go game";
}

export function getShareTitle({
    blackPlayerName,
    draftKind,
    sourceKind,
    whitePlayerName,
}: SharePresentationInput) {
    const blackName = getDisplayPlayerName(blackPlayerName);
    const whiteName = getDisplayPlayerName(whitePlayerName);

    if (blackName && whiteName) {
        return `${blackName} vs ${whiteName}`;
    }

    return (
        blackName ??
        whiteName ??
        getGenericShareTitle({
            draftKind,
            sourceKind,
        })
    );
}

export function getShareDescription({
    draftKind,
    sourceKind,
}: {
    draftKind?: DraftKind | null;
    sourceKind: ShareSourceKind;
}) {
    if (sourceKind === "draft" && draftKind === "variation") {
        return "View this shared Go variation";
    }

    if (sourceKind === "draft") {
        return "View this shared Go game position";
    }

    return "View this shared Go game";
}

export function formatShareDate(date: string) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
    }).format(parsedDate);
}
