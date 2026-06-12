"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const GoBoard = dynamic(() => import("@/components/GoBoard"), {
    ssr: false,
});

export default function GoBoardLoader() {
    const pathname = usePathname();
    const id = pathname.split("/").filter(Boolean).at(1) ?? "";

    return <GoBoard key={id} id={id} />;
}
