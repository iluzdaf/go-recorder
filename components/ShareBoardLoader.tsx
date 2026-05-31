"use client";

import dynamic from "next/dynamic";

import type { ShareRecord } from "./types";

type ShareBoardLoaderProps = {
    share: ShareRecord;
};

const ShareBoard = dynamic(() => import("@/components/ShareGoBoard"), {
    ssr: false,
});

export default function ShareBoardLoader({
    share,
}: ShareBoardLoaderProps) {
    return <ShareBoard share={share} />;
}
