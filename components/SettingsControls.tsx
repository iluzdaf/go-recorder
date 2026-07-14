"use client";

import type { ChangeEvent, ReactNode, RefObject } from "react";
import { useState } from "react";
import {
    ChevronDown,
    Download,
    Expand,
    Minimize2,
    Monitor,
    Moon,
    Sun,
    Upload,
} from "lucide-react";

import { t, type MessageKey } from "../lib/i18n";
import SegmentedControl from "./SegmentedControl";
import type { BoardTheme } from "./AppShell";

type ThemePreference = "system" | "light" | "dark";

type SettingsSectionId = "board" | "app";

const BOARD_THEME_OPTIONS = [
    { labelKey: "minimalistBoardTheme", value: "minimalist" },
    { labelKey: "woodBoardTheme", value: "wood" },
] as const;

const THEME_PREFERENCE_OPTIONS = [
    { labelKey: "appearanceAuto", value: "system" },
    { labelKey: "appearanceLight", value: "light" },
    { labelKey: "appearanceDark", value: "dark" },
] as const;

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
    defaultOpenSection?: SettingsSectionId;
    defaultOpenSections?: readonly SettingsSectionId[];
    openMultipleSections?: boolean;
    showBoardCoordinates: boolean;
    showBoardThemes: boolean;
    showLocalData: boolean;
    themePreference: ThemePreference;
    twoStepPlacement: boolean;
}>;

function rowClassName() {
    return "flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm";
}

function buttonRowClassName() {
    return `${rowClassName()} w-full hover:bg-zinc-50 dark:hover:bg-neutral-900`;
}

function SettingsSection({
    children,
    isOpen,
    onToggle,
    title,
}: Readonly<{
    children: ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    title: string;
}>) {
    return (
        <div className="border-b border-zinc-100 last:border-b-0 dark:border-neutral-800">
            <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-950 dark:text-white"
                aria-expanded={isOpen}
                onClick={onToggle}
            >
                {title}
                <ChevronDown
                    size={15}
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>
            {isOpen ? <div className="flex flex-col gap-1 pb-2">{children}</div> : null}
        </div>
    );
}

function SegmentControl<T extends string>({
    ariaLabel,
    onChange,
    options,
    value,
}: Readonly<{
    ariaLabel: string;
    onChange: (nextValue: T) => void;
    options: readonly { labelKey: MessageKey; value: T }[];
    value: T;
}>) {
    return (
        <SegmentedControl
            role="group"
            ariaLabel={ariaLabel}
            value={value}
            onChange={onChange}
            options={options.map((option) => ({
                value: option.value,
                content: t(option.labelKey),
                ariaLabel: `${ariaLabel}: ${t(option.labelKey)}`,
            }))}
        />
    );
}

function BoardThemeSegment({
    label,
    onChange,
    value,
}: Readonly<{
    label: string;
    onChange: (nextBoardTheme: BoardTheme) => void;
    value: BoardTheme;
}>) {
    return (
        <div className="grid gap-2 px-4 py-3 text-sm">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {label}
            </p>
            <SegmentControl
                ariaLabel={label}
                value={value}
                options={BOARD_THEME_OPTIONS}
                onChange={onChange}
            />
        </div>
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

function SwitchControl({
    checked,
    label,
    onChange,
}: Readonly<{
    checked: boolean;
    label: string;
    onChange: (nextChecked: boolean) => void;
}>) {
    return (
        <label className={rowClassName()}>
            <span>{label}</span>
            <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input
                    type="checkbox"
                    role="switch"
                    className="peer sr-only"
                    checked={checked}
                    aria-label={label}
                    onChange={(event) => {
                        onChange(event.target.checked);
                    }}
                />
                <span className="absolute inset-0 rounded-full bg-zinc-300 transition-colors peer-checked:bg-zinc-950 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-zinc-950 dark:bg-neutral-700 dark:peer-checked:bg-white dark:peer-focus-visible:outline-white" />
                <span className="absolute left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 dark:bg-neutral-950" />
            </span>
        </label>
    );
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
    defaultOpenSection = "app",
    defaultOpenSections,
    openMultipleSections = false,
    showBoardCoordinates,
    showBoardThemes,
    showLocalData,
    themePreference,
    twoStepPlacement,
}: SettingsControlsProps) {
    const initialOpenSections = defaultOpenSections ?? [defaultOpenSection];
    const [openSections, setOpenSections] = useState<SettingsSectionId[]>(
        [...initialOpenSections]
    );

    const toggleSection = (sectionId: SettingsSectionId) => {
        setOpenSections((previous) => {
            if (!openMultipleSections) {
                return previous.includes(sectionId) ? [] : [sectionId];
            }

            if (previous.includes(sectionId)) {
                return previous.filter((openSection) => openSection !== sectionId);
            }

            return [...previous, sectionId];
        });
    };

    return (
        <div className="flex flex-col">
            <SettingsSection
                title={t("appSettings")}
                isOpen={openSections.includes("app")}
                onToggle={() => toggleSection("app")}
            >
                <div className="grid gap-2 px-4 py-3 text-sm">
                    <span className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {t("appearance")}
                        </span>
                        <AppearanceIcon
                            isDarkMode={isDarkMode}
                            themePreference={themePreference}
                        />
                    </span>
                    <div className="w-full">
                        <SegmentControl
                            ariaLabel={t("appearance")}
                            value={themePreference}
                            options={THEME_PREFERENCE_OPTIONS}
                            onChange={onThemePreferenceChange}
                        />
                    </div>
                </div>

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
            </SettingsSection>

            <SettingsSection
                title={t("displaySettings")}
                isOpen={openSections.includes("board")}
                onToggle={() => toggleSection("board")}
            >
                {showBoardThemes ? (
                    <>
                        <BoardThemeSegment
                            label={t("lightBoardTheme")}
                            value={lightBoardTheme}
                            onChange={onLightBoardThemeChange}
                        />
                        <BoardThemeSegment
                            label={t("darkBoardTheme")}
                            value={darkBoardTheme}
                            onChange={onDarkBoardThemeChange}
                        />
                    </>
                ) : null}
                <SwitchControl
                    label={t("showBoardCoordinates")}
                    checked={showBoardCoordinates}
                    onChange={onShowBoardCoordinatesChange}
                />
                <SwitchControl
                    label={t("twoStepPlacement")}
                    checked={twoStepPlacement}
                    onChange={onTwoStepPlacementChange}
                />
            </SettingsSection>
        </div>
    );
}
