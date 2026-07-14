import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@sabaki/shudan/css/goban.css";
import "./goban-overrides.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AppShell from "@/components/AppShell";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { defaultLocale, t } from "@/lib/i18n";
import packageJson from "../package.json";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: t("appTitle"),
  description: t("appDescription"),
  applicationName: t("appTitle"),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: t("appTitle"),
  },
  icons: {
    icon: [
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs synchronously in <head> before first paint so the theme classes are
// present on <html> before the body is painted. This prevents a light-mode
// flash for dark-mode users and lets the server-rendered share board reveal the
// correct (mode x board theme) variant via CSS. The logic mirrors AppShell:
// same "go-recorder:theme" key with system/unset fallback to matchMedia, and
// the active board theme comes from the light/dark board-theme key for the
// resolved mode ("wood" -> board-wood, else minimalist).
const themeInitScript = `(function(){try{var e=document.documentElement;var p=localStorage.getItem("go-recorder:theme");var d=p==="dark"||((p==="system"||p===null)&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)e.classList.add("dark");var b=localStorage.getItem(d?"go-recorder:dark-board-theme":"go-recorder:light-board-theme");if(b==="wood")e.classList.add("board-wood");if(localStorage.getItem("go-recorder:show-board-coordinates")==="false")e.classList.add("board-coords-hidden");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={defaultLocale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full flex flex-col overflow-hidden">
        <AppShell appVersion={packageJson.version}>{children}</AppShell>
        <ServiceWorkerRegistration />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
