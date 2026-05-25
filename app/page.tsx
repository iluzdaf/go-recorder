import GoBoardLoader from "@/components/GoBoardLoader";

export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="mb-4 text-2xl font-bold">Go Recorder</h1>
      <GoBoardLoader />
    </main>
  );
}