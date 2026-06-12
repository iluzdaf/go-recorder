"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import {
    Expand,
    Home,
    Menu,
    Minimize2,
    Moon,
    Settings,
    Sun,
    X,
} from "lucide-react";
import ChangelogReleaseList from "./ChangelogReleaseList";
import { t } from "../lib/i18n";

type ThemeContextValue = {
    isDarkMode: boolean;
    setIsDarkMode: (nextIsDarkMode: boolean) => void;
};

type ThemePreference = "system" | "light" | "dark";

type HeaderActionsContextValue = {
    setHeaderActions: (nextHeaderActions: React.ReactNode) => void;
};

type HeaderStatusContextValue = {
    setHeaderStatus: (nextHeaderStatus: React.ReactNode) => void;
};

type HeaderVisibilityContextValue = {
    isOverlayHeader: boolean;
    isHeaderVisible: boolean;
    setIsHeaderExpanded: (nextIsHeaderExpanded: boolean) => void;
};

type BoardDisplaySettingsContextValue = {
    showBoardCoordinates: boolean;
    setShowBoardCoordinates: (nextShowBoardCoordinates: boolean) => void;
};

const THEME_STORAGE_KEY = "go-recorder:theme";
const BOARD_COORDINATES_STORAGE_KEY = "go-recorder:show-board-coordinates";

const ThemeContext = createContext<ThemeContextValue | null>(null);
const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(
    null
);
const HeaderStatusContext = createContext<HeaderStatusContextValue | null>(
    null
);
const HeaderVisibilityContext = createContext<HeaderVisibilityContextValue | null>(
    null
);
const BoardDisplaySettingsContext =
    createContext<BoardDisplaySettingsContextValue | null>(null);
const themeListeners = new Set<() => void>();
const boardDisplaySettingsListeners = new Set<() => void>();
const THEME_CHANGE_EVENT = "go-recorder:theme-change";
const BOARD_DISPLAY_SETTINGS_CHANGE_EVENT =
    "go-recorder:board-display-settings-change";
const SHORT_VIEWPORT_QUERY = "(max-height: 640px)";

function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribeToShortViewport(onStoreChange: () => void) {
    const shortViewportQuery = window.matchMedia(SHORT_VIEWPORT_QUERY);

    shortViewportQuery.addEventListener("change", onStoreChange);

    return () => {
        shortViewportQuery.removeEventListener("change", onStoreChange);
    };
}

function getIsShortViewport() {
    if (typeof window === "undefined") return false;

    return window.matchMedia(SHORT_VIEWPORT_QUERY).matches;
}

export function shouldUseOverlayHeader({
    isShortViewport,
    pathname,
}: {
    isShortViewport: boolean;
    pathname: string | null | undefined;
}) {
    return Boolean(
        isShortViewport &&
            (pathname?.startsWith("/games/") ||
                pathname?.startsWith("/drafts/") ||
                pathname?.startsWith("/shares/"))
    );
}

export function getChangelogDialogClassName({
    alignToViewportTop,
}: {
    alignToViewportTop: boolean;
}) {
    return alignToViewportTop
        ? "absolute right-4 top-4 z-[60] max-h-[min(36rem,calc(100vh-2rem))] w-[min(28rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-zinc-950 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        : "fixed right-4 top-16 z-[60] max-h-[min(36rem,calc(100vh-5rem))] w-[min(28rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-zinc-950 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";
}

export function getSettingsDialogClassName({
    alignToViewportTop,
}: {
    alignToViewportTop: boolean;
}) {
    return alignToViewportTop
        ? "absolute right-4 top-4 z-[60] max-h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-zinc-950 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        : "fixed right-4 top-16 z-[60] max-h-[calc(100vh-5rem)] w-[min(24rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-zinc-950 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";
}

export function shouldAnchorHeaderDialogsToViewportTop({
    isHeaderVisible,
    usesOverlayHeader,
}: {
    isHeaderVisible: boolean;
    usesOverlayHeader: boolean;
}) {
    return usesOverlayHeader && !isHeaderVisible;
}

function getIsFullscreenSupported() {
    if (typeof document === "undefined") return false;

    const documentElement = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const fullscreenDocument = document as Document & {
        webkitExitFullscreen?: () => Promise<void> | void;
    };

    return Boolean(
        documentElement.requestFullscreen ||
            documentElement.webkitRequestFullscreen
    ) &&
        Boolean(document.exitFullscreen || fullscreenDocument.webkitExitFullscreen);
}

function getIsFullscreen() {
    if (typeof document === "undefined") return false;

    return Boolean(
        document.fullscreenElement ||
            (document as Document & {
                webkitFullscreenElement?: Element | null;
                webkitCurrentFullScreenElement?: Element | null;
            }).webkitFullscreenElement ||
            (document as Document & {
                webkitFullscreenElement?: Element | null;
                webkitCurrentFullScreenElement?: Element | null;
            }).webkitCurrentFullScreenElement
    );
}

function getFullscreenChangeEvents() {
    return ["fullscreenchange", "webkitfullscreenchange"];
}

function getFullscreenErrorEvents() {
    return ["fullscreenerror", "webkitfullscreenerror"];
}

async function requestFullscreen(element: HTMLElement) {
    const webkitElement = element as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
    };

    if (element.requestFullscreen) {
        await element.requestFullscreen();
        return;
    }

    if (webkitElement.webkitRequestFullscreen) {
        await webkitElement.webkitRequestFullscreen();
        return;
    }

    throw new Error("Fullscreen is not supported on this device");
}

async function exitFullscreen() {
    const webkitDocument = document as Document & {
        webkitExitFullscreen?: () => Promise<void> | void;
    };

    if (document.exitFullscreen) {
        await document.exitFullscreen();
        return;
    }

    if (webkitDocument.webkitExitFullscreen) {
        await webkitDocument.webkitExitFullscreen();
        return;
    }

    throw new Error("Fullscreen is not supported on this device");
}

function isThemePreference(value: string | null): value is ThemePreference {
    return value === "system" || value === "light" || value === "dark";
}

function getThemePreferenceFromStorage(): ThemePreference {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (isThemePreference(storedTheme)) return storedTheme;

    return "system";
}

function resolveThemePreference(themePreference: ThemePreference) {
    if (themePreference === "dark") return true;
    if (themePreference === "light") return false;

    return getSystemTheme();
}

function getResolvedThemeFromStorage() {
    return resolveThemePreference(getThemePreferenceFromStorage());
}

function notifyThemeListeners() {
    for (const listener of themeListeners) {
        listener();
    }
}

function setThemePreferenceInStorage(themePreference: ThemePreference) {
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    notifyThemeListeners();
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function setThemeInStorage(isDarkMode: boolean) {
    setThemePreferenceInStorage(isDarkMode ? "dark" : "light");
}

export function resolveShowBoardCoordinatesPreference(
    storedPreference: string | null
) {
    return storedPreference !== "false";
}

function getShowBoardCoordinatesFromStorage() {
    return resolveShowBoardCoordinatesPreference(
        window.localStorage.getItem(BOARD_COORDINATES_STORAGE_KEY)
    );
}

function notifyBoardDisplaySettingsListeners() {
    for (const listener of boardDisplaySettingsListeners) {
        listener();
    }
}

function setShowBoardCoordinatesInStorage(nextShowBoardCoordinates: boolean) {
    window.localStorage.setItem(
        BOARD_COORDINATES_STORAGE_KEY,
        String(nextShowBoardCoordinates)
    );
    notifyBoardDisplaySettingsListeners();
    window.dispatchEvent(new Event(BOARD_DISPLAY_SETTINGS_CHANGE_EVENT));
}

export function useTheme() {
    const value = useContext(ThemeContext);

    if (!value) {
        throw new Error("useTheme must be used within AppShell");
    }

    return value;
}

export function useBoardDisplaySettings() {
    const value = useContext(BoardDisplaySettingsContext);

    if (!value) {
        throw new Error("useBoardDisplaySettings must be used within AppShell");
    }

    return value;
}

export function useHeaderActions() {
    const value = useContext(HeaderActionsContext);

    if (!value) {
        throw new Error("useHeaderActions must be used within AppShell");
    }

    return value;
}

export function useHeaderStatus() {
    const value = useContext(HeaderStatusContext);

    if (!value) {
        throw new Error("useHeaderStatus must be used within AppShell");
    }

    return value;
}

export function useHeaderVisibility() {
    const value = useContext(HeaderVisibilityContext);

    if (!value) {
        throw new Error("useHeaderVisibility must be used within AppShell");
    }

    return value;
}

export default function AppShell({
    children,
    appVersion,
}: Readonly<{
    children: React.ReactNode;
    appVersion: string;
}>) {
    const pathname = usePathname();
    const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
    const [headerStatus, setHeaderStatus] = useState<React.ReactNode>(null);
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(() => getIsFullscreen());
    const changelogButtonRef = useRef<HTMLButtonElement | null>(null);
    const changelogMenuRef = useRef<HTMLDivElement | null>(null);
    const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
    const settingsMenuRef = useRef<HTMLDivElement | null>(null);
    const isFullscreenSupported = useSyncExternalStore(
        () => () => {},
        getIsFullscreenSupported,
        () => false
    );
    const isShortViewport = useSyncExternalStore(
        subscribeToShortViewport,
        getIsShortViewport,
        () => false
    );
    const isDarkMode = useSyncExternalStore(
        (onStoreChange) => {
            themeListeners.add(onStoreChange);
            const systemThemeQuery = window.matchMedia(
                "(prefers-color-scheme: dark)"
            );

            const handleStorage = (event: StorageEvent) => {
                if (event.key === THEME_STORAGE_KEY) {
                    onStoreChange();
                }
            };

            const handleThemeChange = () => {
                onStoreChange();
            };

            const handleSystemThemeChange = () => {
                if (getThemePreferenceFromStorage() === "system") {
                    onStoreChange();
                }
            };

            window.addEventListener("storage", handleStorage);
            window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
            systemThemeQuery.addEventListener("change", handleSystemThemeChange);

            return () => {
                themeListeners.delete(onStoreChange);
                window.removeEventListener("storage", handleStorage);
                window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
                systemThemeQuery.removeEventListener(
                    "change",
                    handleSystemThemeChange
                );
            };
        },
        () => {
            if (typeof window === "undefined") {
                return true;
            }

            return getResolvedThemeFromStorage();
        },
            () => true
    );
    const showBoardCoordinates = useSyncExternalStore(
        (onStoreChange) => {
            boardDisplaySettingsListeners.add(onStoreChange);

            const handleStorage = (event: StorageEvent) => {
                if (event.key === BOARD_COORDINATES_STORAGE_KEY) {
                    onStoreChange();
                }
            };

            const handleBoardDisplaySettingsChange = () => {
                onStoreChange();
            };

            window.addEventListener("storage", handleStorage);
            window.addEventListener(
                BOARD_DISPLAY_SETTINGS_CHANGE_EVENT,
                handleBoardDisplaySettingsChange
            );

            return () => {
                boardDisplaySettingsListeners.delete(onStoreChange);
                window.removeEventListener("storage", handleStorage);
                window.removeEventListener(
                    BOARD_DISPLAY_SETTINGS_CHANGE_EVENT,
                    handleBoardDisplaySettingsChange
                );
            };
        },
        () => {
            if (typeof window === "undefined") {
                return true;
            }

            return getShowBoardCoordinatesFromStorage();
        },
        () => true
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

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDarkMode);
        document.body.classList.toggle("dark", isDarkMode);
    }, [isDarkMode]);

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

    const closeChangelog = useCallback(() => {
        setIsChangelogOpen(false);
    }, []);

    const toggleChangelog = useCallback(() => {
        setIsChangelogOpen((nextIsChangelogOpen) => !nextIsChangelogOpen);
        setIsSettingsOpen(false);
    }, []);

    const closeSettings = useCallback(() => {
        setIsSettingsOpen(false);
    }, []);

    const toggleSettings = useCallback(() => {
        setIsSettingsOpen((nextIsSettingsOpen) => !nextIsSettingsOpen);
        setIsChangelogOpen(false);
    }, []);

    useEffect(() => {
        if (!isChangelogOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (
                changelogButtonRef.current?.contains(event.target as Node) ||
                changelogMenuRef.current?.contains(event.target as Node)
            ) {
                return;
            }

            closeChangelog();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeChangelog();
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [closeChangelog, isChangelogOpen]);

    useEffect(() => {
        if (!isSettingsOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (
                settingsButtonRef.current?.contains(event.target as Node) ||
                settingsMenuRef.current?.contains(event.target as Node)
            ) {
                return;
            }

            closeSettings();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeSettings();
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [closeSettings, isSettingsOpen]);

    const usesOverlayHeader = shouldUseOverlayHeader({
        isShortViewport,
        pathname,
    });
    const isHeaderVisible =
        !usesOverlayHeader || isHeaderExpanded || Boolean(headerStatus);
    const areHeaderDialogsAnchoredToViewportTop =
        shouldAnchorHeaderDialogsToViewportTop({
            isHeaderVisible,
            usesOverlayHeader,
        });

    const contextValue = useMemo(
        () => ({
            isDarkMode,
            setIsDarkMode: setThemeInStorage,
        }),
        [isDarkMode]
    );
    const boardDisplaySettingsContextValue = useMemo(
        () => ({
            showBoardCoordinates,
            setShowBoardCoordinates: setShowBoardCoordinatesInStorage,
        }),
        [showBoardCoordinates]
    );
    const headerActionsContextValue = useMemo(
        () => ({ setHeaderActions }),
        []
    );
    const headerStatusContextValue = useMemo(
        () => ({ setHeaderStatus }),
        []
    );

    return (
        <ThemeContext.Provider value={contextValue}>
            <BoardDisplaySettingsContext.Provider
                value={boardDisplaySettingsContextValue}
            >
            <HeaderActionsContext.Provider value={headerActionsContextValue}>
                <HeaderStatusContext.Provider value={headerStatusContextValue}>
                    <HeaderVisibilityContext.Provider
                        value={{
                            isOverlayHeader: usesOverlayHeader,
                            isHeaderVisible,
                            setIsHeaderExpanded,
                        }}
                    >
                {usesOverlayHeader && !isHeaderVisible ? (
                    <button
                        type="button"
                        className="fixed left-3 top-3 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-lg backdrop-blur hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-950/95 dark:text-zinc-200 dark:hover:bg-neutral-800"
                        aria-label={t("showHeader")}
                        title={t("showHeader")}
                        onClick={() => setIsHeaderExpanded(true)}
                    >
                        <Menu size={18} />
                    </button>
                ) : null}

                {isHeaderVisible ? (
                    <header
                        className={
                            usesOverlayHeader
                                ? "fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 text-zinc-950 shadow-lg backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 dark:text-white"
                                : "flex h-14 flex-shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 text-zinc-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                        }
                    >
                        <div className="flex shrink-0 items-center gap-1.5">
                            <Link
                                href="/"
                                className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-neutral-800"
                                aria-label={t("home")}
                                title={t("home")}
                            >
                                <Home size={18} />
                            </Link>

                        </div>

                        <div className="relative flex min-w-0 flex-1 items-center justify-center px-3">
                            {headerStatus}
                            {headerActions}
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                            <button
                                ref={changelogButtonRef}
                                type="button"
                                className="inline-flex h-11 items-center justify-center rounded-md px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                                aria-label={`${t("version")} ${appVersion}`}
                                aria-controls="changelog-menu"
                                aria-expanded={isChangelogOpen}
                                aria-haspopup="dialog"
                                title={t("changelog")}
                                onClick={toggleChangelog}
                            >
                                v{appVersion}
                            </button>

                            <button
                                ref={settingsButtonRef}
                                type="button"
                                className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-neutral-800"
                                aria-label={t("settings")}
                                aria-controls="settings-menu"
                                aria-expanded={isSettingsOpen}
                                aria-haspopup="dialog"
                                title={t("settings")}
                                onClick={toggleSettings}
                            >
                                <Settings size={18} />
                            </button>

                            {usesOverlayHeader ? (
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-neutral-800"
                                    aria-label={t("hideHeader")}
                                    title={t("hideHeader")}
                                    onClick={() => setIsHeaderExpanded(false)}
                                >
                                    <X size={18} />
                                </button>
                            ) : null}
                        </div>
                    </header>
                ) : null}
                {isChangelogOpen ? (
                    <div
                        id="changelog-menu"
                        ref={changelogMenuRef}
                        className={getChangelogDialogClassName({
                            alignToViewportTop:
                                areHeaderDialogsAnchoredToViewportTop,
                        })}
                    >
                        <div className="mb-3">
                            <p className="text-sm font-semibold">
                                {t("changelog")}
                            </p>
                        </div>
                        <ChangelogReleaseList />
                    </div>
                ) : null}
                {isSettingsOpen ? (
                    <div
                        id="settings-menu"
                        ref={settingsMenuRef}
                        role="dialog"
                        aria-modal="false"
                        aria-labelledby="settings-menu-title"
                        className={getSettingsDialogClassName({
                            alignToViewportTop:
                                areHeaderDialogsAnchoredToViewportTop,
                        })}
                    >
                        <div className="mb-3">
                            <p
                                id="settings-menu-title"
                                className="text-sm font-semibold"
                            >
                                {t("settings")}
                            </p>
                        </div>

                        <div className="grid gap-3">
                            <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950">
                                <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                                    {t("displaySettings")}
                                </p>
                                <div className="mt-3 grid gap-2">
                                    <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                                        <span>{t("boardCoordinates")}</span>
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 accent-zinc-950 dark:accent-white"
                                            checked={showBoardCoordinates}
                                            aria-label={t("showBoardCoordinates")}
                                            onChange={(event) => {
                                                setShowBoardCoordinatesInStorage(
                                                    event.target.checked
                                                );
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
                                    <button
                                        type="button"
                                        className="inline-flex min-h-11 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                                        aria-label={
                                            isDarkMode
                                                ? t("switchToLightMode")
                                                : t("switchToDarkMode")
                                        }
                                        onClick={() => {
                                            setThemeInStorage(!isDarkMode);
                                        }}
                                    >
                                        <span>
                                            {isDarkMode
                                                ? t("lightMode")
                                                : t("darkMode")}
                                        </span>
                                        {isDarkMode ? (
                                            <Sun size={18} />
                                        ) : (
                                            <Moon size={18} />
                                        )}
                                    </button>

                                    {isFullscreenSupported ? (
                                        <button
                                            type="button"
                                            className="inline-flex min-h-11 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                                            aria-label={
                                                isFullscreen
                                                    ? t("exitFullscreen")
                                                    : t("enterFullscreen")
                                            }
                                            onClick={() => {
                                                void toggleFullscreen();
                                            }}
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
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {children}
                </div>
                    </HeaderVisibilityContext.Provider>
                </HeaderStatusContext.Provider>
            </HeaderActionsContext.Provider>
            </BoardDisplaySettingsContext.Provider>
        </ThemeContext.Provider>
    );
}
