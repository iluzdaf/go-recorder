"use client";

import type { ChangeEvent, RefObject } from "react";
import {
    Download,
    Expand,
    Minimize2,
    Monitor,
    Moon,
    Sun,
    Upload,
} from "lucide-react";

import { t } from "../lib/i18n";
import type { BoardTheme } from "./AppShell";

type ThemePreference = "system" | "light" | "dark";

type SettingsControlsProps = Readonly<{
    darkBoardTheme: BoardTheme;
    isDarkMode: boolean;
    isFullscreen: boolean;
    isFullscreenSupported: boolean;
    lightBoardTheme: BoardTheme;
    localDataFileInputRef?: RefObject<HTMLInputElement | null>;
    localDataStatus?: string | null;
    onDarkBoardThemeChange: (nextBoardTheme: BoardTheme) => void;
    onExportLocalData?: () => void;
    onImportLocalDataChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    onImportLocalDataClick?: () => void;
    onLightBoardThemeChange: (nextBoardTheme: BoardTheme) => void;
    onShowBoardCoordinatesChange: (nextShowBoardCoordinates: boolean) => void;
    onThemePreferenceChange: (nextThemePreference: ThemePreference) => void;
    onToggleFullscreen: () => void;
    onTwoStepPlacementChange: (nextTwoStepPlacement: boolean) => void;
    showBoardCoordinates: boolean;
    showBoardThemes: boolean;
    showLocalData: boolean;
    themePreference: ThemePreference;
    twoStepPlacement: boolean;
}>;

function selectClassName() {
    return "h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";
}

function rowClassName() {
    return "flex min-h-11 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
}

function buttonRowClassName() {
    return `${rowClassName()} hover:bg-zinc-100 dark:hover:bg-neutral-800`;
}

function BoardThemeSelect({
    label,
    onChange,
    value,
}: Readonly<{
    label: string;
    onChange: (nextBoardTheme: BoardTheme) => void;
    value: BoardTheme;
}>) {
    return (
        <label className="grid gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <span>{label}</span>
            <select
                className={selectClassName()}
                value={value}
                aria-label={label}
                onChange={(event) => {
                    onChange(event.target.value as BoardTheme);
                }}
            >
                <option value="minimalist">{t("minimalistBoardTheme")}</option>
                <option value="wood">{t("woodBoardTheme")}</option>
            </select>
        </label>
    );
}

function AppearanceIcon({
    isDarkMode,
    themePreference,
}: Readonly<{
    isDarkMode: boolean;
    themePreference: ThemePreference;
}>) {
    if (themePreference === "system") return <Monitor size={18} />;

    return isDarkMode ? <Moon size={18} /> : <Sun size={18} />;
}

export default function SettingsControls({
    darkBoardTheme,
    isDarkMode,
    isFullscreen,
    isFullscreenSupported,
    lightBoardTheme,
    localDataFileInputRef,
    localDataStatus,
    onDarkBoardThemeChange,
    onExportLocalData,
    onImportLocalDataChange,
    onImportLocalDataClick,
    onLightBoardThemeChange,
    onShowBoardCoordinatesChange,
    onThemePreferenceChange,
    onToggleFullscreen,
    onTwoStepPlacementChange,
    showBoardCoordinates,
    showBoardThemes,
    showLocalData,
    themePreference,
    twoStepPlacement,
}: SettingsControlsProps) {
    return (
        <div className="grid gap-3">
            <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950">
                <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                    {t("displaySettings")}
                </p>
                <div className="mt-3 grid gap-2">
                    {showBoardThemes ? (
                        <>
                            <BoardThemeSelect
                                label={t("lightBoardTheme")}
                                value={lightBoardTheme}
                                onChange={onLightBoardThemeChange}
                            />
                            <BoardThemeSelect
                                label={t("darkBoardTheme")}
                                value={darkBoardTheme}
                                onChange={onDarkBoardThemeChange}
                            />
                        </>
                    ) : null}
                    <label className={rowClassName()}>
                        <span>{t("boardCoordinates")}</span>
                        <input
                            type="checkbox"
                            className="h-5 w-5 accent-zinc-950 dark:accent-white"
                            checked={showBoardCoordinates}
                            aria-label={t("showBoardCoordinates")}
                            onChange={(event) => {
                                onShowBoardCoordinatesChange(event.target.checked);
                            }}
                        />
                    </label>
                    <label className={rowClassName()}>
                        <span>{t("twoStepPlacement")}</span>
                        <input
                            type="checkbox"
                            className="h-5 w-5 accent-zinc-950 dark:accent-white"
                            checked={twoStepPlacement}
                            aria-label={t("twoStepPlacement")}
                            onChange={(event) => {
                                onTwoStepPlacementChange(event.target.checked);
                            }}
                        />
                    </label>
                </div>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950">
                <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                    {t("appSettings")}
                </p>
                <div className="mt-3 grid gap-2">
                    <label className="grid gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                        <span>{t("appearance")}</span>
                        <span className="flex items-center gap-2">
                            <select
                                className={`${selectClassName()} flex-1`}
                                value={themePreference}
                                aria-label={t("appearance")}
                                onChange={(event) => {
                                    onThemePreferenceChange(
                                        event.target.value as ThemePreference
                                    );
                                }}
                            >
                                <option value="system">{t("appearanceAuto")}</option>
                                <option value="light">{t("appearanceLight")}</option>
                                <option value="dark">{t("appearanceDark")}</option>
                            </select>
                            <AppearanceIcon
                                isDarkMode={isDarkMode}
                                themePreference={themePreference}
                            />
                        </span>
                    </label>

                    {isFullscreenSupported ? (
                        <button
                            type="button"
                            className={buttonRowClassName()}
                            aria-label={
                                isFullscreen
                                    ? t("exitFullscreen")
                                    : t("enterFullscreen")
                            }
                            onClick={onToggleFullscreen}
                        >
                            <span>
                                {isFullscreen
                                    ? t("exitFullscreen")
                                    : t("enterFullscreen")}
                            </span>
                            {isFullscreen ? (
                                <Minimize2 size={18} />
                            ) : (
                                <Expand size={18} />
                            )}
                        </button>
                    ) : null}

                    {showLocalData ? (
                        <>
                            <button
                                type="button"
                                className={buttonRowClassName()}
                                onClick={onExportLocalData}
                            >
                                <span>{t("exportLocalData")}</span>
                                <Download size={18} />
                            </button>
                            <button
                                type="button"
                                className={buttonRowClassName()}
                                onClick={onImportLocalDataClick}
                            >
                                <span>{t("importLocalData")}</span>
                                <Upload size={18} />
                            </button>
                            <input
                                ref={localDataFileInputRef}
                                type="file"
                                accept="application/json,.json"
                                className="hidden"
                                onChange={onImportLocalDataChange}
                            />
                            {localDataStatus ? (
                                <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-zinc-300">
                                    {localDataStatus}
                                </p>
                            ) : null}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
