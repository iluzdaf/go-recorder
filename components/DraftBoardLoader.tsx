"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const DraftGoBoard = dynamic(() => import("./DraftGoBoard"), {
    ssr: false,
});

export default function DraftBoardLoader() {
    const pathname = usePathname();
    const id = pathname.split("/").filter(Boolean).at(1) ?? "";

    return <DraftGoBoard key={id} id={id} />;
}
