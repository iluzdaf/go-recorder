"use client";

import dynamic from "next/dynamic";

const GoBoard = dynamic(() => import("@/components/Goban"), {
    ssr: false,
});

export default function GoBoardLoader() {
    return <GoBoard />;
}