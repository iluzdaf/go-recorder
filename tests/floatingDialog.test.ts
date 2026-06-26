import { describe, expect, it } from "vitest";

import { shouldCloseFloatingDialogOnPointerDown } from "../lib/floatingDialog";

describe("shouldCloseFloatingDialogOnPointerDown", () => {
    const target = {} as Node;

    it("closes when clicking outside both dialog and trigger", () => {
        expect(
            shouldCloseFloatingDialogOnPointerDown({
                target,
                dialogEl: { contains: () => false },
                triggerEl: { contains: () => false },
            })
        ).toBe(true);
    });

    it("stays open when clicking inside the dialog", () => {
        expect(
            shouldCloseFloatingDialogOnPointerDown({
                target,
                dialogEl: { contains: () => true },
                triggerEl: { contains: () => false },
            })
        ).toBe(false);
    });

    it("stays open when clicking the trigger", () => {
        expect(
            shouldCloseFloatingDialogOnPointerDown({
                target,
                dialogEl: { contains: () => false },
                triggerEl: { contains: () => true },
            })
        ).toBe(false);
    });

    it("closes when dialogEl is null", () => {
        expect(
            shouldCloseFloatingDialogOnPointerDown({
                target,
                dialogEl: null,
                triggerEl: { contains: () => false },
            })
        ).toBe(true);
    });

    it("closes when triggerEl is null", () => {
        expect(
            shouldCloseFloatingDialogOnPointerDown({
                target,
                dialogEl: { contains: () => false },
                triggerEl: null,
            })
        ).toBe(true);
    });

    it("closes when both elements are null", () => {
        expect(
            shouldCloseFloatingDialogOnPointerDown({
                target,
                dialogEl: null,
                triggerEl: null,
            })
        ).toBe(true);
    });
});
