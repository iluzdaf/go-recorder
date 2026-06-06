"use client";

import dynamic from "next/dynamic";

type DraftBoardLoaderProps = {
    id: string;
};

const DraftGoBoard = dynamic(() => import("./DraftGoBoard"), {
    ssr: false,
});

export default function DraftBoardLoader({ id }: DraftBoardLoaderProps) {
    return <DraftGoBoard key={id} id={id} />;
}
