"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(async () => {
        const registration = await navigator.serviceWorker.ready;
        await warmLocalWorkflowAssets();

        registration.active?.postMessage({
          type: "CACHE_OFFLINE_FLOWS",
          shellUrls: [
            "/games",
            "/drafts",
            "/games/__offline-shell__",
            "/drafts/__offline-shell__",
          ],
          staticAssetUrls: getLoadedStaticAssetUrls(),
        });
      })
      .catch(() => {
        // Local recording should continue even when PWA registration is unavailable.
      });
  }, []);

  return null;
}

async function warmLocalWorkflowAssets() {
  await Promise.allSettled([
    import("@/components/GoBoard"),
    import("@/components/DraftGoBoard"),
  ]);
}

function getLoadedStaticAssetUrls() {
  const urls = new Set<string>();

  document
    .querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[href]")
    .forEach((element) => {
      const assetUrl =
        element instanceof HTMLScriptElement ? element.src : element.href;

      if (isSameOriginNextStaticAsset(assetUrl)) {
        urls.add(assetUrl);
      }
    });

  return Array.from(urls);
}

function isSameOriginNextStaticAsset(assetUrl: string) {
  try {
    const url = new URL(assetUrl);

    return (
      url.origin === window.location.origin &&
      url.pathname.startsWith("/_next/static/")
    );
  } catch {
    return false;
  }
}
