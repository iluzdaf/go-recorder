// Resolves the canonical absolute site origin used for OpenGraph/metadata URLs.
// Preview deployments prefer the per-deployment VERCEL_URL so link previews
// point at the branch being reviewed; production prefers the stable configured
// site URL and falls back to Vercel-provided origins, then localhost in dev.
export function getSiteUrl() {
    const vercelUrl = process.env.VERCEL_URL;
    const configuredUrl =
        process.env.VERCEL_ENV === "preview"
            ? vercelUrl ?? process.env.NEXT_PUBLIC_SITE_URL
            : process.env.NEXT_PUBLIC_SITE_URL ??
              process.env.VERCEL_PROJECT_PRODUCTION_URL ??
              vercelUrl;

    if (!configuredUrl) {
        return "http://localhost:3000";
    }

    return configuredUrl.startsWith("http")
        ? configuredUrl
        : `https://${configuredUrl}`;
}
