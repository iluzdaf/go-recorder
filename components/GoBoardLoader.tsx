"use client";

import dynamic from "next/dynamic";

type GoBoardLoaderProps = {
    slug: string;
};

const GoBoard = dynamic(() => import("@/components/Goban"), {
    ssr: false,
});

export default function GoBoardLoader({ slug }: GoBoardLoaderProps) {
    return <GoBoard slug={slug} />;
}