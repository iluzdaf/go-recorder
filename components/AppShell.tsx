"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    ChevronLeft,
    Home,
    Menu,
    Settings,
} from "lucide-react";
import ChangelogReleaseList from "./ChangelogReleaseList";
import SettingsControls from "./SettingsControls";
import useFloatingDialog from "./useFloatingDialog";
import { t } from "../lib/i18n";
import { navigateWithinApp } from "../lib/fullscreenNavigation";

type ThemeContextValue = {
    isDarkMode: boolean;
    themePreference: ThemePreference;
    setIsDarkMode: (nextIsDarkMode: boolean) => void;
    setThemePreference: (nextThemePreference: ThemePreference) => void;
};

export type ThemePreference = "system" | "light" | "dark";
export type BoardTheme = "minimalist" | "wood";

type HeaderActionsContextValue = {
    setHeaderActions: (nextHeaderActions: React.ReactNode) => void;
};

type HeaderStatusContextValue = {
    setHeaderStatus: (nextHeaderStatus: React.ReactNode) => void;
};

type HeaderMenuIconContextValue = {
    setHeaderMenuIcon: (nextHeaderMenuIcon: React.ReactNode) => void;
};

type HeaderVisibilityContextValue = {
    isOverlayHeader: boolean;
    isHeaderVisible: boolean;
    setIsHeaderExpanded: (nextIsHeaderExpanded: boolean) => void;
};

type BoardDisplaySettingsContextValue = {
    showBoardCoordinates: boolean;
    setShowBoardCoordinates: (nextShowBoardCoordinates: boolean) => void;
    twoStepPlacement: boolean;
    setTwoStepPlacement: (nextTwoStepPlacement: boolean) => void;
    lightBoardTheme: BoardTheme;
    setLightBoardTheme: (nextBoardTheme: BoardTheme) => void;
    darkBoardTheme: BoardTheme;
    setDarkBoardTheme: (nextBoardTheme: BoardTheme) => void;
    activeBoardThemeClassName: string;
};

function GithubMarkIcon({ size = 18 }: { size?: number }) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="currentColor"
        >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
    );
}

const THEME_STORAGE_KEY = "go-recorder:theme";
const BOARD_COORDINATES_STORAGE_KEY = "go-recorder:show-board-coordinates";
const BOARD_TWO_STEP_PLACEMENT_STORAGE_KEY = "go-recorder:two-step-placement";
const LIGHT_BOARD_THEME_STORAGE_KEY = "go-recorder:light-board-theme";
const DARK_BOARD_THEME_STORAGE_KEY = "go-recorder:dark-board-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);
const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(
    null
);
const HeaderStatusContext = createContext<HeaderStatusContextValue | null>(
    null
);
const HeaderMenuIconContext =
    createContext<HeaderMenuIconContextValue | null>(null);
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
const APP_NAVIGATION_STORAGE_KEY = "go-recorder:app-navigation";

type AppNavigationState = {
    entries: string[];
    index: number;
};

function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}


function normalizeAppPath(pathname: string | null | undefined) {
    if (!pathname?.startsWith("/")) return "/";

    return pathname;
}

function normalizeReturnPath(pathname: string | null | undefined) {
    if (!pathname?.startsWith("/")) return null;

    return pathname;
}

export function shouldOpenSettingsDialogFromPath(
    pathname: string | null | undefined
) {
    return normalizeAppPath(pathname) !== "/settings";
}

function normalizeAppNavigationState(
    value: unknown
): AppNavigationState {
    if (
        typeof value !== "object" ||
        value === null ||
        !Array.isArray((value as Partial<AppNavigationState>).entries)
    ) {
        return { entries: [], index: -1 };
    }

    const entries = (value as Partial<AppNavigationState>).entries?.filter(
        (entry): entry is string => typeof entry === "string" && entry.startsWith("/")
    ) ?? [];
    const index = (value as Partial<AppNavigationState>).index;

    if (typeof index !== "number" || !Number.isInteger(index)) {
        return { entries, index: entries.length - 1 };
    }

    return {
        entries,
        index: Math.min(Math.max(index, -1), entries.length - 1),
    };
}

export function updateAppNavigationStateForPath({
    pathname,
    state,
}: {
    pathname: string | null | undefined;
    state: AppNavigationState;
}): AppNavigationState {
    const nextPath = normalizeAppPath(pathname);
    const normalizedState = normalizeAppNavigationState(state);

    if (nextPath === "/") {
        return { entries: ["/"], index: 0 };
    }

    const currentPath = normalizedState.entries[normalizedState.index];

    if (currentPath === nextPath) {
        return normalizedState;
    }

    const existingPathIndex = normalizedState.entries.lastIndexOf(nextPath);

    if (existingPathIndex >= 0) {
        return {
            entries: normalizedState.entries,
            index: existingPathIndex,
        };
    }

    return {
        entries: [
            ...normalizedState.entries.slice(0, normalizedState.index + 1),
            nextPath,
        ],
        index: normalizedState.index + 1,
    };
}

export function getAppNavigationTargets(state: AppNavigationState) {
    const normalizedState = normalizeAppNavigationState(state);
    const backPath =
        normalizedState.index > 0
            ? normalizedState.entries[normalizedState.index - 1]
            : null;

    return {
        backPath: backPath ?? null,
    };
}

function getAppNavigationBackPath(state: AppNavigationState) {
    const normalizedState = normalizeAppNavigationState(state);
    const nextIndex = normalizedState.index - 1;

    if (nextIndex < 0 || nextIndex >= normalizedState.entries.length) {
        return null;
    }

    return normalizedState.entries[nextIndex] ?? null;
}

function readAppNavigationState() {
    if (typeof window === "undefined") return { entries: [], index: -1 };

    try {
        return normalizeAppNavigationState(
            JSON.parse(
                window.sessionStorage.getItem(APP_NAVIGATION_STORAGE_KEY) ??
                    "null"
            )
        );
    } catch {
        return { entries: [], index: -1 };
    }
}

function writeAppNavigationState(state: AppNavigationState) {
    window.sessionStorage.setItem(
        APP_NAVIGATION_STORAGE_KEY,
        JSON.stringify(normalizeAppNavigationState(state))
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

export function getIsFullscreenSupported() {
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

export function getIsFullscreen() {
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

export function getFullscreenChangeEvents() {
    return ["fullscreenchange", "webkitfullscreenchange"];
}

export function getFullscreenErrorEvents() {
    return ["fullscreenerror", "webkitfullscreenerror"];
}

export async function requestFullscreen(element: HTMLElement) {
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

export async function exitFullscreen() {
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

export function getNextThemePreference(
    themePreference: ThemePreference
): ThemePreference {
    if (themePreference === "light") return "dark";
    if (themePreference === "dark") return "system";

    return "light";
}

function isBoardTheme(value: string | null): value is BoardTheme {
    return value === "minimalist" || value === "wood";
}

export function resolveBoardThemePreference(
    storedPreference: string | null
): BoardTheme {
    return isBoardTheme(storedPreference) ? storedPreference : "minimalist";
}

export function getBoardThemeClassName({
    boardTheme,
    isDarkMode,
}: {
    boardTheme: BoardTheme;
    isDarkMode: boolean;
}) {
    if (boardTheme === "wood") {
        return isDarkMode ? "goban-theme-wood-dark" : "goban-theme-wood-light";
    }

    return isDarkMode ? "goban-theme-dark" : "goban-theme-light";
}

export function getBoardSurfaceClassName({
    activeBoardThemeClassName,
    extraClassName = "",
    isDarkMode,
}: {
    activeBoardThemeClassName: string;
    extraClassName?: string;
    isDarkMode: boolean;
}) {
    const modeClassName = isDarkMode
        ? "bg-neutral-900 text-white"
        : "bg-zinc-100 text-zinc-950";
    const extra = extraClassName ? `${extraClassName} ` : "";

    return `${extra}${activeBoardThemeClassName} relative m-0 flex min-h-0 flex-1 touch-none flex-col overflow-hidden overscroll-none p-0 ${modeClassName}`;
}

function getThemePreferenceFromStorage(): ThemePreference {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (isThemePreference(storedTheme)) return storedTheme;

    return "system";
}

function getLightBoardThemeFromStorage() {
    return resolveBoardThemePreference(
        window.localStorage.getItem(LIGHT_BOARD_THEME_STORAGE_KEY)
    );
}

function getDarkBoardThemeFromStorage() {
    return resolveBoardThemePreference(
        window.localStorage.getItem(DARK_BOARD_THEME_STORAGE_KEY)
    );
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

export function resolveTwoStepPlacementPreference(
    storedPreference: string | null
) {
    return storedPreference === "true";
}

function getTwoStepPlacementFromStorage() {
    return resolveTwoStepPlacementPreference(
        window.localStorage.getItem(BOARD_TWO_STEP_PLACEMENT_STORAGE_KEY)
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

function setTwoStepPlacementInStorage(nextTwoStepPlacement: boolean) {
    window.localStorage.setItem(
        BOARD_TWO_STEP_PLACEMENT_STORAGE_KEY,
        String(nextTwoStepPlacement)
    );
    notifyBoardDisplaySettingsListeners();
    window.dispatchEvent(new Event(BOARD_DISPLAY_SETTINGS_CHANGE_EVENT));
}

function setLightBoardThemeInStorage(nextBoardTheme: BoardTheme) {
    window.localStorage.setItem(LIGHT_BOARD_THEME_STORAGE_KEY, nextBoardTheme);
    notifyBoardDisplaySettingsListeners();
    window.dispatchEvent(new Event(BOARD_DISPLAY_SETTINGS_CHANGE_EVENT));
}

function setDarkBoardThemeInStorage(nextBoardTheme: BoardTheme) {
    window.localStorage.setItem(DARK_BOARD_THEME_STORAGE_KEY, nextBoardTheme);
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

export function useHeaderMenuIcon() {
    const value = useContext(HeaderMenuIconContext);

    if (!value) {
        throw new Error("useHeaderMenuIcon must be used within AppShell");
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
    const router = useRouter();
    const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
    const [headerStatus, setHeaderStatus] = useState<React.ReactNode>(null);
    const [headerMenuIcon, setHeaderMenuIcon] =
        useState<React.ReactNode>(null);
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(() => getIsFullscreen());
    const [appNavigationState, setAppNavigationState] =
        useState<AppNavigationState>(() => ({ entries: [], index: -1 }));
    const {
        close: closeChangelog,
        dialogRef: changelogDialogRef,
        isOpen: isChangelogOpen,
        toggle: toggleChangelogDialog,
        triggerRef: changelogTriggerRef,
    } = useFloatingDialog();
    const {
        close: closeSettings,
        dialogRef: settingsDialogRef,
        isOpen: isSettingsOpen,
        toggle: toggleSettingsDialog,
        triggerRef: settingsTriggerRef,
    } = useFloatingDialog();
    const headerRef = useRef<HTMLElement | null>(null);
    const isFullscreenSupported = useSyncExternalStore(
        () => () => {},
        getIsFullscreenSupported,
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
    const themePreference = useSyncExternalStore<ThemePreference>(
        (onStoreChange) => {
            themeListeners.add(onStoreChange);

            const handleStorage = (event: StorageEvent) => {
                if (event.key === THEME_STORAGE_KEY) {
                    onStoreChange();
                }
            };

            const handleThemeChange = () => {
                onStoreChange();
            };

            window.addEventListener("storage", handleStorage);
            window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

            return () => {
                themeListeners.delete(onStoreChange);
                window.removeEventListener("storage", handleStorage);
                window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
            };
        },
        () => {
            if (typeof window === "undefined") {
                return "system";
            }

            return getThemePreferenceFromStorage();
        },
        () => "system"
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
    const twoStepPlacement = useSyncExternalStore(
        (onStoreChange) => {
            boardDisplaySettingsListeners.add(onStoreChange);

            const handleStorage = (event: StorageEvent) => {
                if (event.key === BOARD_TWO_STEP_PLACEMENT_STORAGE_KEY) {
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
                return false;
            }

            return getTwoStepPlacementFromStorage();
        },
        () => false
    );
    const lightBoardTheme = useSyncExternalStore<BoardTheme>(
        (onStoreChange) => {
            boardDisplaySettingsListeners.add(onStoreChange);

            const handleStorage = (event: StorageEvent) => {
                if (event.key === LIGHT_BOARD_THEME_STORAGE_KEY) {
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
                return "minimalist";
            }

            return getLightBoardThemeFromStorage();
        },
        () => "minimalist"
    );
    const darkBoardTheme = useSyncExternalStore<BoardTheme>(
        (onStoreChange) => {
            boardDisplaySettingsListeners.add(onStoreChange);

            const handleStorage = (event: StorageEvent) => {
                if (event.key === DARK_BOARD_THEME_STORAGE_KEY) {
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
                return "minimalist";
            }

            return getDarkBoardThemeFromStorage();
        },
        () => "minimalist"
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

    const privacyReturnPath = useMemo(() => {
        if (pathname !== "/privacy" || typeof window === "undefined") {
            return null;
        }

        const nextReturnPath = new URLSearchParams(
            window.location.search
        ).get("returnTo");
        return normalizeReturnPath(nextReturnPath);
    }, [pathname]);

    useEffect(() => {
        const nextState = updateAppNavigationStateForPath({
            pathname,
            state: readAppNavigationState(),
        });

        writeAppNavigationState(nextState);

        const timeoutId = window.setTimeout(() => {
            setAppNavigationState(nextState);
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [pathname]);

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

    const handleNavigateBack = useCallback(() => {
        const currentState = readAppNavigationState();
        const targetPath =
            privacyReturnPath ?? getAppNavigationBackPath(currentState);

        if (!targetPath) return;

        const targetPathIndex = currentState.entries.lastIndexOf(targetPath);
        const nextState =
            targetPathIndex >= 0
                ? {
                      entries: currentState.entries,
                      index: targetPathIndex,
                  }
                : updateAppNavigationStateForPath({
                      pathname: targetPath,
                      state: currentState,
                  });

        writeAppNavigationState(nextState);
        setAppNavigationState(nextState);
        navigateWithinApp({
            path: targetPath,
            push: router.push,
        });
    }, [privacyReturnPath, router.push]);

    const toggleChangelog = useCallback(() => {
        closeSettings();
        toggleChangelogDialog();
    }, [closeSettings, toggleChangelogDialog]);

    const toggleSettings = useCallback(() => {
        closeChangelog();
        if (!shouldOpenSettingsDialogFromPath(pathname)) {
            closeSettings();
            return;
        }
        toggleSettingsDialog();
    }, [closeChangelog, closeSettings, pathname, toggleSettingsDialog]);

    const handleShowMoreSettings = useCallback(() => {
        closeSettings();
        navigateWithinApp({
            path: "/settings",
            push: router.push,
        });
    }, [closeSettings, router.push]);

    const usesOverlayHeader = true;
    const isHeaderVisible = isHeaderExpanded;

    useEffect(() => {
        if (!isHeaderVisible) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (
                !headerRef.current?.contains(target) &&
                !changelogDialogRef.current?.contains(target) &&
                !settingsDialogRef.current?.contains(target)
            ) {
                setIsHeaderExpanded(false);
                closeChangelog();
                closeSettings();
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [isHeaderVisible, changelogDialogRef, settingsDialogRef, closeChangelog, closeSettings]);

    const areHeaderDialogsAnchoredToViewportTop =
        shouldAnchorHeaderDialogsToViewportTop({
            isHeaderVisible,
            usesOverlayHeader,
        });
    const { backPath: appBackPath } = getAppNavigationTargets(appNavigationState);
    const backPath = privacyReturnPath ?? appBackPath;

    const contextValue = useMemo(
        () => ({
            isDarkMode,
            themePreference,
            setIsDarkMode: setThemeInStorage,
            setThemePreference: setThemePreferenceInStorage,
        }),
        [isDarkMode, themePreference]
    );
    const activeBoardTheme = isDarkMode ? darkBoardTheme : lightBoardTheme;
    const activeBoardThemeClassName = getBoardThemeClassName({
        boardTheme: activeBoardTheme,
        isDarkMode,
    });
    const boardDisplaySettingsContextValue = useMemo(
        () => ({
            showBoardCoordinates,
            setShowBoardCoordinates: setShowBoardCoordinatesInStorage,
            twoStepPlacement,
            setTwoStepPlacement: setTwoStepPlacementInStorage,
            lightBoardTheme,
            setLightBoardTheme: setLightBoardThemeInStorage,
            darkBoardTheme,
            setDarkBoardTheme: setDarkBoardThemeInStorage,
            activeBoardThemeClassName,
        }),
        [
            activeBoardThemeClassName,
            darkBoardTheme,
            lightBoardTheme,
            showBoardCoordinates,
            twoStepPlacement,
        ]
    );
    const headerActionsContextValue = useMemo(
        () => ({ setHeaderActions }),
        []
    );
    const headerStatusContextValue = useMemo(
        () => ({ setHeaderStatus }),
        []
    );
    const headerMenuIconContextValue = useMemo(
        () => ({ setHeaderMenuIcon }),
        []
    );

    return (
        <ThemeContext.Provider value={contextValue}>
            <BoardDisplaySettingsContext.Provider
                value={boardDisplaySettingsContextValue}
            >
            <HeaderActionsContext.Provider value={headerActionsContextValue}>
                <HeaderStatusContext.Provider value={headerStatusContextValue}>
                <HeaderMenuIconContext.Provider
                    value={headerMenuIconContextValue}
                >
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
                        {headerMenuIcon ?? <Menu size={18} />}
                    </button>
                ) : null}

                {isHeaderVisible ? (
                    <header
                        ref={headerRef}
                        className={
                            usesOverlayHeader
                                ? "fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 text-zinc-950 shadow-lg backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 dark:text-white"
                                : "flex h-14 flex-shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 text-zinc-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                        }
                    >
                        <div className="flex shrink-0 items-center gap-1.5">
                            {backPath ? (
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-neutral-800"
                                    aria-label={t("goBack")}
                                    title={t("goBack")}
                                    onClick={handleNavigateBack}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-neutral-800"
                                aria-label={t("home")}
                                title={t("home")}
                                onClick={() => {
                                    navigateWithinApp({
                                        path: "/",
                                        push: router.push,
                                    });
                                }}
                            >
                                <Home size={18} />
                            </button>

                        </div>

                        <div className="relative flex min-w-0 flex-1 items-center justify-center px-3">
                            {headerActions}
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                            {pathname === "/changelog" ? (
                                <span className="inline-flex h-11 items-center justify-center rounded-md px-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    v{appVersion}
                                </span>
                            ) : (
                                <button
                                    ref={changelogTriggerRef}
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
                            )}

                            <button
                                ref={settingsTriggerRef}
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

                        </div>
                    </header>
                ) : null}
                {isChangelogOpen ? (
                    <div
                        id="changelog-menu"
                        ref={changelogDialogRef}
                        className={getChangelogDialogClassName({
                            alignToViewportTop:
                                areHeaderDialogsAnchoredToViewportTop,
                        })}
                    >
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">
                                {t("changelog")}
                            </p>
                            <a
                                href="https://github.com/iluzdaf/go-recorder"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                                aria-label={t("githubProject")}
                                title={t("githubProject")}
                            >
                                <GithubMarkIcon size={18} />
                            </a>
                        </div>
                        <ChangelogReleaseList limit={2} />
                        <Link
                            href="/changelog"
                            className="ml-auto mt-3 flex w-fit text-sm font-semibold text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                            onClick={closeChangelog}
                        >
                            {t("showMoreChangelog")}
                        </Link>
                    </div>
                ) : null}
                {isSettingsOpen ? (
                    <div
                        id="settings-menu"
                        ref={settingsDialogRef}
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

                        <SettingsControls
                            darkBoardTheme={darkBoardTheme}
                            isDarkMode={isDarkMode}
                            isFullscreen={isFullscreen}
                            isFullscreenSupported={isFullscreenSupported}
                            lightBoardTheme={lightBoardTheme}
                            onDarkBoardThemeChange={setDarkBoardThemeInStorage}
                            onLightBoardThemeChange={setLightBoardThemeInStorage}
                            onShowBoardCoordinatesChange={
                                setShowBoardCoordinatesInStorage
                            }
                            onThemePreferenceChange={setThemePreferenceInStorage}
                            onToggleFullscreen={() => {
                                void toggleFullscreen();
                            }}
                            onTwoStepPlacementChange={
                                setTwoStepPlacementInStorage
                            }
                            showBoardCoordinates={showBoardCoordinates}
                            showBoardThemes={false}
                            showLocalData={false}
                            themePreference={themePreference}
                            twoStepPlacement={twoStepPlacement}
                        />
                        <button
                            type="button"
                            className="ml-auto mt-3 flex w-fit text-sm font-semibold text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                            onClick={handleShowMoreSettings}
                        >
                            {t("showMoreSettings")}
                        </button>
                    </div>
                ) : null}
                {headerStatus ? (
                    <div
                        className={`pointer-events-none fixed bottom-0 left-0 right-0 z-[55] ${isHeaderVisible ? "top-14" : "top-0"}`}
                    >
                        {headerStatus}
                    </div>
                ) : null}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {children}
                </div>
                    </HeaderVisibilityContext.Provider>
                </HeaderMenuIconContext.Provider>
                </HeaderStatusContext.Provider>
            </HeaderActionsContext.Provider>
            </BoardDisplaySettingsContext.Provider>
        </ThemeContext.Provider>
    );
}
