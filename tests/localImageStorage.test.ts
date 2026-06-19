import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ImageSourceMetadata } from "../components/types";
import {
    deleteImageSource,
    getImageSource,
    storeImageSource,
} from "../lib/localImageStorage";

function makeStore() {
    const data = new Map<string, ImageSourceMetadata>();

    const store = {
        put: vi.fn((record: ImageSourceMetadata) => {
            data.set(record.id, record);
            const req = { onerror: null as (() => void) | null };
            return req;
        }),
        get: vi.fn((id: string) => {
            const req = {
                result: data.get(id) ?? undefined,
                onsuccess: null as (() => void) | null,
                onerror: null as (() => void) | null,
            };
            Promise.resolve().then(() => req.onsuccess?.());
            return req;
        }),
        delete: vi.fn((id: string) => {
            data.delete(id);
            const req = { onerror: null as (() => void) | null };
            return req;
        }),
    };

    function makeTx() {
        const tx = {
            objectStore: vi.fn(() => store),
            oncomplete: null as (() => void) | null,
            onerror: null as (() => void) | null,
            error: null,
        };
        Promise.resolve().then(() => tx.oncomplete?.());
        return tx;
    }

    const db = {
        objectStoreNames: { contains: vi.fn(() => true) },
        createObjectStore: vi.fn(),
        transaction: vi.fn(() => makeTx()),
        close: vi.fn(),
    };

    return { data, db };
}

function installIndexedDbMock(db: ReturnType<typeof makeStore>["db"]) {
    const openRequest = {
        result: db,
        onupgradeneeded: null as ((e: { target: unknown }) => void) | null,
        onsuccess: null as ((e: { target: unknown }) => void) | null,
        onerror: null as (() => void) | null,
        error: null,
    };

    Promise.resolve().then(() => {
        openRequest.onsuccess?.({ target: openRequest });
    });

    vi.stubGlobal("window", {
        indexedDB: {
            open: vi.fn(() => openRequest),
        },
    });
}

const corners: ImageSourceMetadata["corners"] = [
    { x: 0.1, y: 0.1 },
    { x: 0.9, y: 0.1 },
    { x: 0.9, y: 0.9 },
    { x: 0.1, y: 0.9 },
];

const baseMetadata: Omit<ImageSourceMetadata, "id"> = {
    dataUrl: "data:image/png;base64,abc123",
    naturalWidth: 800,
    naturalHeight: 600,
    corners,
};

describe("localImageStorage", () => {
    beforeEach(() => {
        vi.stubGlobal("crypto", {
            randomUUID: vi.fn(() => "test-uuid-1234"),
        });
    });

    it("stores image metadata and returns an id", async () => {
        const { db } = makeStore();
        installIndexedDbMock(db);

        const id = await storeImageSource(baseMetadata);

        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
        expect(db.transaction).toHaveBeenCalledWith("image-sources", "readwrite");
    });

    it("retrieves stored image metadata by id", async () => {
        const { data, db } = makeStore();
        installIndexedDbMock(db);

        const id = await storeImageSource(baseMetadata);
        const stored = data.get(id);
        expect(stored).toMatchObject({ ...baseMetadata, id });

        installIndexedDbMock(db);
        const result = await getImageSource(id);
        expect(result).toMatchObject({ ...baseMetadata, id });
    });

    it("returns null when the id does not exist", async () => {
        const { db } = makeStore();
        installIndexedDbMock(db);

        const result = await getImageSource("nonexistent-id");
        expect(result).toBeNull();
    });

    it("deletes image metadata by id", async () => {
        const { data, db } = makeStore();
        installIndexedDbMock(db);

        const id = await storeImageSource(baseMetadata);
        expect(data.has(id)).toBe(true);

        installIndexedDbMock(db);
        await deleteImageSource(id);
        expect(data.has(id)).toBe(false);
    });

    it("stored metadata includes all fields", async () => {
        const { data, db } = makeStore();
        installIndexedDbMock(db);

        const id = await storeImageSource(baseMetadata);
        const stored = data.get(id)!;

        expect(stored.dataUrl).toBe(baseMetadata.dataUrl);
        expect(stored.naturalWidth).toBe(800);
        expect(stored.naturalHeight).toBe(600);
        expect(stored.corners).toEqual(corners);
    });
});
