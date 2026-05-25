import { redirect } from "next/navigation";

export default async function Home() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/games`, {
    method: "POST",
    cache: "no-store",
  });

  const { slug } = await response.json();

  redirect(`/games/${slug}`);
}