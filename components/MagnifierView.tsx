import type {
    MagnifierCoordinateLabel,
    MagnifierHorizontalLine,
    MagnifierRenderCell,
    MagnifierVerticalLine,
} from "../lib/magnifier";
import { MAGNIFIER_SIZE_PX } from "../lib/magnifier";

type MagnifierViewProps = {
    isDarkMode: boolean;
    left: number;
    top: number;
    magnifierStoneSizePx: number;
    horizontalLines: MagnifierHorizontalLine[];
    verticalLines: MagnifierVerticalLine[];
    cells: MagnifierRenderCell[];
    coordinateLabels: MagnifierCoordinateLabel[];
};

export default function MagnifierView({
    isDarkMode,
    left,
    top,
    magnifierStoneSizePx,
    horizontalLines,
    verticalLines,
    cells,
    coordinateLabels,
}: MagnifierViewProps) {
    const coordinateColor = isDarkMode ? "#71717a" : "#52525b";

    return (
        <div
            className={
                isDarkMode
                    ? "pointer-events-none fixed z-50 overflow-hidden rounded-full border border-sky-400/70 bg-neutral-950/95 text-white shadow-2xl"
                    : "pointer-events-none fixed z-50 overflow-hidden rounded-full border border-sky-600/70 bg-zinc-100/95 text-zinc-950 shadow-2xl"
            }
            style={{
                top,
                left,
                width: `${MAGNIFIER_SIZE_PX}px`,
                height: `${MAGNIFIER_SIZE_PX}px`,
            }}
            data-testid="magnifier"
        >
            <div
                className="absolute"
                style={{
                    inset: 0,
                }}
            >
                <div
                    className={
                        isDarkMode
                            ? "relative h-full w-full bg-neutral-800"
                            : "relative h-full w-full bg-zinc-200"
                    }
                >
                    {horizontalLines.map((line) => (
                        <div
                            key={line.key}
                            className={
                                isDarkMode
                                    ? "absolute h-px bg-neutral-600"
                                    : "absolute h-px bg-zinc-500"
                            }
                            style={{
                                top: `${line.top}%`,
                                left: `${line.left}%`,
                                width: `${line.right - line.left}%`,
                            }}
                            data-line-key={line.key}
                        />
                    ))}
                    {verticalLines.map((line) => (
                        <div
                            key={line.key}
                            className={
                                isDarkMode
                                    ? "absolute w-px bg-neutral-600"
                                    : "absolute w-px bg-zinc-500"
                            }
                            style={{
                                left: `${line.left}%`,
                                top: `${line.top}%`,
                                height: `${line.bottom - line.top}%`,
                            }}
                            data-line-key={line.key}
                        />
                    ))}
                    {cells.map((cell) => {
                        return (
                            <div
                                key={cell.key}
                                className="absolute -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${cell.left}px`, top: `${cell.top}px` }}
                                data-cell-key={cell.key}
                            >
                                <div className="relative h-0 w-0">
                                    {cell.sign === 0 && cell.isStarPoint && (
                                        <div
                                            className={
                                                isDarkMode
                                                    ? "absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400"
                                                    : "absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-600"
                                            }
                                            data-testid={`star-${cell.key}`}
                                        />
                                    )}
                                    {cell.isCenter && (
                                        <div
                                            className="absolute left-1/2 top-1/2 rounded-full border border-sky-400"
                                            style={{
                                                width: `${magnifierStoneSizePx + 6}px`,
                                                height: `${magnifierStoneSizePx + 6}px`,
                                                transform: "translate(-50%, -50%)",
                                            }}
                                            data-testid="preview-ring"
                                        />
                                    )}
                                    {cell.sign === 1 && (
                                        <div
                                            className="absolute left-1/2 top-1/2 rounded-full bg-black"
                                            style={{
                                                width: `${magnifierStoneSizePx}px`,
                                                height: `${magnifierStoneSizePx}px`,
                                                transform: "translate(-50%, -50%)",
                                            }}
                                        />
                                    )}
                                    {cell.sign === -1 && (
                                        <div
                                            className="absolute left-1/2 top-1/2 rounded-full border border-neutral-900 bg-white"
                                            style={{
                                                width: `${magnifierStoneSizePx}px`,
                                                height: `${magnifierStoneSizePx}px`,
                                                transform: "translate(-50%, -50%)",
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {coordinateLabels.map((label) => (
                <div
                    key={label.key}
                    className={
                        "absolute z-30 inline-flex items-center justify-center text-[10px] font-semibold leading-none"
                    }
                    style={{
                        left: `${label.left}px`,
                        top: `${label.top}px`,
                        transform: "translate(-50%, -50%)",
                        color: coordinateColor,
                    }}
                    aria-hidden="true"
                >
                    {label.text}
                </div>
            ))}
        </div>
    );
}
