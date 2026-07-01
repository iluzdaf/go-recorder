import type { ReactNode } from "react";

type SecondaryPageShellProps = Readonly<{
    title: string;
    children: ReactNode;
}>;

export default function SecondaryPageShell({
    title,
    children,
}: SecondaryPageShellProps) {
    return (
        <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
            <h1 className="mb-4 text-right text-lg font-semibold">{title}</h1>
            <div className="flex min-h-full w-full flex-col gap-5">{children}</div>
        </main>
    );
}
