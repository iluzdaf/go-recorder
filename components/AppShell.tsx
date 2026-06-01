"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from "react";
import { CircleDot, Home, Moon, Share2, Sun } from "lucide-react";
import { t } from "@/lib/i18n";

type ThemeContextValue = {
    isDarkMode: boolean;
    setIsDarkMode: (nextIsDarkMode: boolean) => void;
};

type ThemePreference = "system" | "light" | "dark";

type HeaderActionsContextValue = {
    setHeaderActions: (nextHeaderActions: React.ReactNode) => void;
};

const THEME_STORAGE_KEY = "go-recorder:theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);
const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(
    null
);
const themeListeners = new Set<() => void>();
const THEME_CHANGE_EVENT = "go-recorder:theme-change";

function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
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

export default function AppShell({
    children,
    appVersion,
}: Readonly<{
    children: React.ReactNode;
    appVersion: string;
}>) {
    const pathname = usePathname();
    const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
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
        document.documentElement.classList.toggle("dark", isDarkMode);
        document.body.classList.toggle("dark", isDarkMode);
    }, [isDarkMode]);

    const isRecordingGame = pathname?.startsWith("/games/");
    const isShareView = pathname?.startsWith("/shares/");

    const contextValue = useMemo(
        () => ({
            isDarkMode,
            setIsDarkMode: setThemeInStorage,
        }),
        [isDarkMode]
    );

    return (
        <ThemeContext.Provider value={contextValue}>
            <HeaderActionsContext.Provider value={{ setHeaderActions }}>
                <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 text-zinc-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
                    <div className="flex items-center gap-1.5">
                        <Link
                            href="/"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-neutral-800"
                            aria-label={t("home")}
                            title={t("home")}
                        >
                            <Home size={18} />
                        </Link>

                        {isRecordingGame ? (
                            <div
                                className="inline-flex h-9 w-9 items-center justify-center text-rose-600 dark:text-rose-400"
                                aria-label={t("gameRecordingInProgress")}
                                title={t("gameRecordingInProgress")}
                            >
                                <CircleDot size={18} />
                            </div>
                        ) : null}

                        {isShareView ? (
                            <div
                                className="inline-flex h-9 w-9 items-center justify-center text-sky-600 dark:text-sky-400"
                                aria-label={t("shareView")}
                                title={t("shareView")}
                            >
                                <Share2 size={18} />
                            </div>
                        ) : null}
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-center px-3">
                        {headerActions}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Link
                            href="/changelog"
                            className="inline-flex h-11 items-center justify-center rounded-md px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                            aria-label={`${t("version")} ${appVersion}`}
                            title={t("changelog")}
                        >
                            v{appVersion}
                        </Link>

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
                    </div>
                </header>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {children}
                </div>
            </HeaderActionsContext.Provider>
        </ThemeContext.Provider>
    );
}
