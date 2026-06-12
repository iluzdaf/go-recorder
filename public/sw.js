const CACHE_VERSION = "v1";
const SHELL_CACHE = `go-recorder-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `go-recorder-static-${CACHE_VERSION}`;
const SHARE_CACHE = `go-recorder-shares-${CACHE_VERSION}`;
const APP_SHELL_URL = "/";
const GAMES_INDEX_URL = "/games";
const DRAFTS_INDEX_URL = "/drafts";
const GAME_SHELL_URL = "/games/__offline-shell__";
const DRAFT_SHELL_URL = "/drafts/__offline-shell__";

const PRECACHE_URLS = [
  APP_SHELL_URL,
  "/manifest.webmanifest",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/pwa-maskable-192.png",
  "/pwa-maskable-512.png",
];

const LOCAL_NAVIGATION_PREFIXES = ["/games/", "/drafts/"];
const LOCAL_NAVIGATION_PATHS = new Set(["/", "/games", "/drafts"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                ![SHELL_CACHE, STATIC_CACHE, SHARE_CACHE].includes(cacheName),
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request, url));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_SHARE_PAGE") {
    event.waitUntil(cacheSharePage(event.data.sharePath));
    return;
  }

  if (event.data?.type !== "CACHE_OFFLINE_FLOWS") {
    return;
  }

  const shellUrls = Array.isArray(event.data.shellUrls)
    ? event.data.shellUrls
    : [];
  const staticAssetUrls = Array.isArray(event.data.staticAssetUrls)
    ? event.data.staticAssetUrls
    : [];

  event.waitUntil(
    Promise.all([
      cacheShellDocuments(shellUrls),
      cacheStaticAssets(staticAssetUrls),
    ]),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}

async function cacheStaticAssets(urls) {
  const cache = await caches.open(STATIC_CACHE);
  const sameOriginStaticUrls = urls.filter((url) => {
    try {
      const parsedUrl = new URL(url);

      return (
        parsedUrl.origin === self.location.origin &&
        parsedUrl.pathname.startsWith("/_next/static/")
      );
    } catch {
      return false;
    }
  });

  await Promise.all(
    sameOriginStaticUrls.map(async (url) => {
      const request = new Request(url);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        return;
      }

      const response = await fetch(request);

      if (response.ok) {
        await cache.put(request, response);
      }
    }),
  );
}

async function cacheShellDocuments(urls) {
  const cache = await caches.open(SHELL_CACHE);
  const sameOriginShellUrls = urls.filter((url) => {
    try {
      const parsedUrl = new URL(url, self.location.origin);

      return (
        parsedUrl.origin === self.location.origin &&
        [
          GAMES_INDEX_URL,
          DRAFTS_INDEX_URL,
          GAME_SHELL_URL,
          DRAFT_SHELL_URL,
        ].includes(parsedUrl.pathname)
      );
    } catch {
      return false;
    }
  });

  await Promise.all(
    sameOriginShellUrls.map(async (url) => {
      const request = new Request(url, {
        credentials: "same-origin",
        headers: {
          Accept: "text/html",
        },
      });
      const response = await fetch(request);

      if (response.ok) {
        const responseCopy = response.clone();
        const shellStaticUrls = getStaticAssetUrlsFromHtml(await response.text());

        await cache.put(new URL(url, self.location.origin).pathname, responseCopy);
        await cacheStaticAssets(shellStaticUrls);
      }
    }),
  );
}

async function cacheSharePage(sharePath) {
  if (typeof sharePath !== "string") {
    return;
  }

  let url;

  try {
    url = new URL(sharePath, self.location.origin);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin || !isSharePageNavigation(url.pathname)) {
    return;
  }

  const request = new Request(url.pathname, {
    credentials: "same-origin",
    headers: {
      Accept: "text/html",
    },
  });
  let response;

  try {
    response = await fetch(request);
  } catch {
    return;
  }

  if (response.ok) {
    const responseCopy = response.clone();
    const shellStaticUrls = getStaticAssetUrlsFromHtml(await response.text());
    const cache = await caches.open(SHARE_CACHE);

    await cache.put(url.pathname, responseCopy);
    await cacheStaticAssets(shellStaticUrls);
  }
}

async function navigationResponse(request, url) {
  try {
    const response = await fetch(request);

    if (response.ok && isLocalNavigation(url.pathname)) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }

    if (response.ok && isSharePageNavigation(url.pathname)) {
      const cache = await caches.open(SHARE_CACHE);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    if (isSharePageNavigation(url.pathname)) {
      const cache = await caches.open(SHARE_CACHE);
      const cachedShare = await cache.match(request);

      if (cachedShare) {
        return cachedShare;
      }

      throw error;
    }

    if (!isLocalNavigation(url.pathname)) {
      throw error;
    }

    const cache = await caches.open(SHELL_CACHE);
    const cachedPage = await cache.match(request);
    const cachedShell = await cache.match(getFallbackShellUrl(url.pathname));

    if (cachedPage) {
      return cachedPage;
    }

    if (cachedShell) {
      return cachedShell;
    }

    throw error;
  }
}

function isLocalNavigation(pathname) {
  return (
    LOCAL_NAVIGATION_PATHS.has(pathname) ||
    LOCAL_NAVIGATION_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function isSharePageNavigation(pathname) {
  return (
    pathname.startsWith("/shares/") &&
    !pathname.endsWith("/opengraph-image") &&
    !pathname.includes("/opengraph-image/")
  );
}

function getFallbackShellUrl(pathname) {
  if (pathname.startsWith("/games/")) {
    return GAME_SHELL_URL;
  }

  if (pathname.startsWith("/drafts/")) {
    return DRAFT_SHELL_URL;
  }

  if (pathname === "/games") {
    return GAMES_INDEX_URL;
  }

  if (pathname === "/drafts") {
    return DRAFTS_INDEX_URL;
  }

  return APP_SHELL_URL;
}

function getStaticAssetUrlsFromHtml(html) {
  return Array.from(html.matchAll(/["']([^"']*\/_next\/static\/[^"']+)["']/g))
    .map((match) => match[1])
    .filter(Boolean)
    .map((url) => new URL(url, self.location.origin).toString());
}
