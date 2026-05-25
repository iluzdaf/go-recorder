import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/games`, {
        method: "POST",
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Failed to create game");
    }

    const { slug } = await response.json();

    redirect(`/games/${slug}`);
}