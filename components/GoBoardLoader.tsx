"use client";

import dynamic from "next/dynamic";

type GoBoardLoaderProps = {
    id: string;
};

const GoBoard = dynamic(() => import("@/components/GoBoard"), {
    ssr: false,
});

export default function GoBoardLoader({ id }: GoBoardLoaderProps) {
    return <GoBoard key={id} id={id} />;
}
