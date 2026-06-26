type ContainsNode = { contains: (node: Node | null) => boolean };

export function shouldCloseFloatingDialogOnPointerDown({
    target,
    dialogEl,
    triggerEl,
}: {
    target: Node;
    dialogEl: ContainsNode | null;
    triggerEl: ContainsNode | null;
}): boolean {
    return !dialogEl?.contains(target) && !triggerEl?.contains(target);
}
