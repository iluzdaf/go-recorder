import type { PositionView, ShareRecord } from "../components/types";

export function getShareBoardPositionView(
    share: Pick<ShareRecord, "positionView" | "sourceKind">
): PositionView | null {
    return share.sourceKind === "draft" ? share.positionView ?? null : null;
}
