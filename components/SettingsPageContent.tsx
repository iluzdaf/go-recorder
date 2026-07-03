"use client";

import type { ChangeEvent } from "react";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";

import {
    exitFullscreen,
    getFullscreenChangeEvents,
    getFullscreenErrorEvents,
    getIsFullscreen,
    getIsFullscreenSupported,
    requestFullscreen,
    useBoardDisplaySettings,
    useTheme,
} from "./AppShell";
import SettingsControls from "./SettingsControls";
import { t } from "../lib/i18n";
import {
    downloadLocalDataExport,
    importLocalDataFromFile,
    LOCAL_DATA_MIGRATION_CHANGE_EVENT,
} from "../lib/localDataMigration";

export default function SettingsPageContent() {
    const {
        isDarkMode,
        setThemePreference,
        themePreference,
    } = useTheme();
    const {
        darkBoardTheme,
        lightBoardTheme,
        setDarkBoardTheme,
        setLightBoardTheme,
        setShowBoardCoordinates,
        setTwoStepPlacement,
        showBoardCoordinates,
        twoStepPlacement,
    } = useBoardDisplaySettings();
    const [isFullscreen, setIsFullscreen] = useState(() => getIsFullscreen());
    const [localDataStatus, setLocalDataStatus] = useState<string | null>(null);
    const localDataFileInputRef = useRef<HTMLInputElement | null>(null);
    const isFullscreenSupported = useSyncExternalStore(
        () => () => {},
        getIsFullscreenSupported,
        () => false
    );

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(getIsFullscreen());
        };

        const handleFullscreenError = () => {
            setIsFullscreen(getIsFullscreen());
        };

        for (const eventName of getFullscreenChangeEvents()) {
            document.addEventListener(eventName, handleFullscreenChange);
        }
        for (const eventName of getFullscreenErrorEvents()) {
            document.addEventListener(eventName, handleFullscreenError);
        }

        return () => {
            for (const eventName of getFullscreenChangeEvents()) {
                document.removeEventListener(eventName, handleFullscreenChange);
            }
            for (const eventName of getFullscreenErrorEvents()) {
                document.removeEventListener(eventName, handleFullscreenError);
            }
        };
    }, []);

    const toggleFullscreen = useCallback(async () => {
        if (typeof document === "undefined") return;

        try {
            if (getIsFullscreen()) {
                await exitFullscreen();
                return;
            }

            await requestFullscreen(document.documentElement);
        } catch {
            setIsFullscreen(getIsFullscreen());
        }
    }, []);

    const handleExportLocalData = useCallback(async () => {
        try {
            const payload = await downloadLocalDataExport();
            const totalRecords = payload.games.length + payload.drafts.length;
            const imageSourceSummary = payload.imageSources.length
                ? ` and ${payload.imageSources.length} image sources`
                : "";

            setLocalDataStatus(
                `${t("localDataExported")}: ${totalRecords} local records${imageSourceSummary}.`
            );
        } catch {
            setLocalDataStatus(t("localDataExportFailed"));
        }
    }, []);

    const handleImportLocalDataClick = useCallback(() => {
        localDataFileInputRef.current?.click();
    }, []);

    const handleImportLocalDataChange = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = "";

            if (!file) return;

            try {
                const result = await importLocalDataFromFile(file);
                const imageSourceSummary = result.imageSourcesImported
                    ? ` and ${result.imageSourcesImported} image sources`
                    : "";

                setLocalDataStatus(
                    `${t("localDataImported")}: ${result.gamesImported} games, ${result.draftsImported} drafts${imageSourceSummary}.`
                );
                window.dispatchEvent(
                    new Event(LOCAL_DATA_MIGRATION_CHANGE_EVENT)
                );
            } catch {
                setLocalDataStatus(t("localDataImportFailed"));
            }
        },
        []
    );

    return (
        <SettingsControls
            darkBoardTheme={darkBoardTheme}
            isDarkMode={isDarkMode}
            isFullscreen={isFullscreen}
            isFullscreenSupported={isFullscreenSupported}
            lightBoardTheme={lightBoardTheme}
            localDataFileInputRef={localDataFileInputRef}
            localDataStatus={localDataStatus}
            onDarkBoardThemeChange={setDarkBoardTheme}
            onExportLocalData={() => {
                void handleExportLocalData();
            }}
            onImportLocalDataChange={handleImportLocalDataChange}
            onImportLocalDataClick={handleImportLocalDataClick}
            onLightBoardThemeChange={setLightBoardTheme}
            onShowBoardCoordinatesChange={setShowBoardCoordinates}
            onThemePreferenceChange={setThemePreference}
            onToggleFullscreen={() => {
                void toggleFullscreen();
            }}
            onTwoStepPlacementChange={setTwoStepPlacement}
            defaultOpenSections={["app", "board"]}
            openMultipleSections={true}
            showBoardCoordinates={showBoardCoordinates}
            showBoardThemes={true}
            showLocalData={true}
            themePreference={themePreference}
            twoStepPlacement={twoStepPlacement}
        />
    );
}
