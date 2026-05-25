import GoBoardLoader from "@/components/GoBoardLoader";

type PageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export default async function GamePage({ params }: PageProps) {
    const { slug } = await params;

    return (
        <main className="m-0 h-dvh overflow-hidden p-0">
            <GoBoardLoader slug={slug} />
        </main>
    );
}