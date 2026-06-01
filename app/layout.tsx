import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@sabaki/shudan/css/goban.css";
import "./goban-overrides.css";
import { Analytics } from "@vercel/analytics/react";
import AppShell from "@/components/AppShell";
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
};

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
      <body className="h-full flex flex-col overflow-hidden">
        <AppShell appVersion={packageJson.version}>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}
