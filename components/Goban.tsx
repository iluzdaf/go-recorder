"use client";

import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType } from "react";

const Goban = ShudanGoban as unknown as ComponentType<any>;

export default function GoBoard() {
    const size = 19;

    const signMap = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 0)
    );

    return (
        <div className="p-4">
            <Goban vertexSize={24} signMap={signMap} />
        </div>
    );
}