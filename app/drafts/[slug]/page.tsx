import DraftBoardLoader from "../../../components/DraftBoardLoader";

type PageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export default async function DraftPage({ params }: PageProps) {
    const { slug } = await params;

    return (
        <main className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <DraftBoardLoader id={slug} />
        </main>
    );
}
