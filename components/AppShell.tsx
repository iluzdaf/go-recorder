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
import { Expand, Home, Menu, Minimize2, Moon, Sun, X } from "lucide-react";
import ChangelogReleaseList from "./ChangelogReleaseList";
import { t } from "@/lib/i18n";

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

const THEME_STORAGE_KEY = "go-recorder:theme";

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
const themeListeners = new Set<() => void>();
const THEME_CHANGE_EVENT = "go-recorder:theme-change";
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

export function useTheme() {
    const value = useContext(ThemeContext);

    if (!value) {
        throw new Error("useTheme must be used within AppShell");
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
    const [isFullscreen, setIsFullscreen] = useState(() => getIsFullscreen());
    const changelogButtonRef = useRef<HTMLButtonElement | null>(null);
    const changelogMenuRef = useRef<HTMLDivElement | null>(null);
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

    const isRecordingGame = pathname?.startsWith("/games/");
    const usesOverlayHeader = Boolean(
        isShortViewport && (isRecordingGame || pathname?.startsWith("/shares/"))
    );
    const isHeaderVisible =
        !usesOverlayHeader || isHeaderExpanded || Boolean(headerStatus);

    const contextValue = useMemo(
        () => ({
            isDarkMode,
            setIsDarkMode: setThemeInStorage,
        }),
        [isDarkMode]
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
                                ? "fixed left-0 right-0 top-0 z-50 flex min-h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 py-1 text-zinc-950 shadow-lg backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 dark:text-white"
                                : "flex min-h-14 flex-shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-1 text-zinc-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
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

                        <div className="flex min-w-0 flex-1 items-center justify-center px-3">
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
                                type="button"
                                className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-neutral-800"
                                aria-label={isDarkMode ? t("switchToLightMode") : t("switchToDarkMode")}
                                title={isDarkMode ? t("lightMode") : t("darkMode")}
                                onClick={() => {
                                    setThemeInStorage(!isDarkMode);
                                }}
                            >
                                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>

                            {isFullscreenSupported ? (
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-neutral-800"
                                    aria-label={
                                        isFullscreen
                                            ? t("exitFullscreen")
                                            : t("enterFullscreen")
                                    }
                                    title={
                                        isFullscreen
                                            ? t("exitFullscreen")
                                            : t("enterFullscreen")
                                    }
                                    onClick={() => {
                                        void toggleFullscreen();
                                    }}
                                >
                                    {isFullscreen ? (
                                        <Minimize2 size={18} />
                                    ) : (
                                        <Expand size={18} />
                                    )}
                                </button>
                            ) : null}

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
                        className="fixed right-4 top-16 z-[60] max-h-[min(36rem,calc(100vh-5rem))] w-[min(28rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-zinc-950 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    >
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">
                                {t("changelog")}
                            </p>
                            <button
                                type="button"
                                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md hover:bg-zinc-200 dark:hover:bg-neutral-800"
                                aria-label={t("closeChangelog")}
                                title={t("closeChangelog")}
                                onClick={closeChangelog}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <ChangelogReleaseList />
                    </div>
                ) : null}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {children}
                </div>
                    </HeaderVisibilityContext.Provider>
                </HeaderStatusContext.Provider>
            </HeaderActionsContext.Provider>
        </ThemeContext.Provider>
    );
}
