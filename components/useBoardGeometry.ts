"use client";

import { useEffect, useRef, useState } from "react";

import {
    createDefaultBoardGridMetrics,
    getBoardVertexSize,
    type BoardGridMetrics,
} from "../lib/boardGeometry";

type UseBoardGeometryOptions = {
    boardSize: number;
    measureGrid?: boolean;
};

export default function useBoardGeometry({
    boardSize,
    measureGrid = false,
}: UseBoardGeometryOptions) {
    const boardAreaRef = useRef<HTMLDivElement | null>(null);
    const gobanWrapperRef = useRef<HTMLDivElement | null>(null);
    const [vertexSize, setVertexSize] = useState(24);
    const [gridMetrics, setGridMetrics] = useState<BoardGridMetrics>(() =>
        createDefaultBoardGridMetrics(boardSize)
    );

    useEffect(() => {
        const boardArea = boardAreaRef.current;
        if (!boardArea) return;

        const updateGridMetrics = () => {
            if (!measureGrid) return;

            const gobanWrapper = gobanWrapperRef.current;
            if (!gobanWrapper) return;

            const grid = gobanWrapper.querySelector(".shudan-grid");
            if (!(grid instanceof SVGElement)) return;

            const wrapperRect = gobanWrapper.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            const nextGridMetrics = {
                left: gridRect.left - wrapperRect.left,
                top: gridRect.top - wrapperRect.top,
                cellSize: gridRect.width / boardSize,
                boardSizePx: gridRect.width,
            };

            setGridMetrics((currentGridMetrics) =>
                currentGridMetrics.left === nextGridMetrics.left &&
                currentGridMetrics.top === nextGridMetrics.top &&
                currentGridMetrics.cellSize === nextGridMetrics.cellSize &&
                currentGridMetrics.boardSizePx === nextGridMetrics.boardSizePx
                    ? currentGridMetrics
                    : nextGridMetrics
            );
        };

        let animationFrameId: number | null = null;
        const updateBoardGeometry = () => {
            const { width, height } = boardArea.getBoundingClientRect();
            const nextVertexSize = getBoardVertexSize({
                boardSize,
                width,
                height,
            });

            setVertexSize((currentVertexSize) =>
                currentVertexSize === nextVertexSize
                    ? currentVertexSize
                    : nextVertexSize
            );

            updateGridMetrics();

            if (!measureGrid) return;

            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }
            animationFrameId = window.requestAnimationFrame(() => {
                animationFrameId = null;
                updateGridMetrics();
            });
        };

        updateBoardGeometry();

        const resizeObserver = new ResizeObserver(updateBoardGeometry);
        resizeObserver.observe(boardArea);
        if (measureGrid && gobanWrapperRef.current) {
            resizeObserver.observe(gobanWrapperRef.current);
        }
        window.addEventListener("resize", updateBoardGeometry);
        window.addEventListener("orientationchange", updateBoardGeometry);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateBoardGeometry);
            window.removeEventListener("orientationchange", updateBoardGeometry);
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }
        };
    }, [boardSize, measureGrid]);

    return {
        boardAreaRef,
        gobanWrapperRef,
        gridMetrics,
        setGridMetrics,
        vertexSize,
    };
}
