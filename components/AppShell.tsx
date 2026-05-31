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

type ThemeContextValue = {
    isDarkMode: boolean;
    setIsDarkMode: (nextIsDarkMode: boolean) => void;
};

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

function getThemeFromStorage() {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme === "dark" || storedTheme === "light") {
        return storedTheme === "dark";
    }

    return getSystemTheme();
}

function notifyThemeListeners() {
    for (const listener of themeListeners) {
        listener();
    }
}

function setThemeInStorage(isDarkMode: boolean) {
    window.localStorage.setItem(
        THEME_STORAGE_KEY,
        isDarkMode ? "dark" : "light"
    );
    notifyThemeListeners();
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
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
}: Readonly<{
    children: React.ReactNode;
}>) {
    const pathname = usePathname();
    const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
    const isDarkMode = useSyncExternalStore(
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
                return true;
            }

            return getThemeFromStorage();
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
                            aria-label="Home"
                            title="Home"
                        >
                            <Home size={18} />
                        </Link>

                        {isRecordingGame ? (
                            <div
                                className="inline-flex h-9 w-9 items-center justify-center text-rose-600 dark:text-rose-400"
                                aria-label="Game recording in progress"
                                title="Game recording in progress"
                            >
                                <CircleDot size={18} />
                            </div>
                        ) : null}

                        {isShareView ? (
                            <div
                                className="inline-flex h-9 w-9 items-center justify-center text-sky-600 dark:text-sky-400"
                                aria-label="Share view"
                                title="Share view"
                            >
                                <Share2 size={18} />
                            </div>
                        ) : null}
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-center px-3">
                        {headerActions}
                    </div>

                    <button
                        type="button"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-neutral-800"
                        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                        title={isDarkMode ? "Light mode" : "Dark mode"}
                        onClick={() => {
                            setThemeInStorage(!isDarkMode);
                        }}
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </header>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {children}
                </div>
            </HeaderActionsContext.Provider>
        </ThemeContext.Provider>
    );
}
