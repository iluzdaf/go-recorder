type RandomSource = Partial<Pick<Crypto, "getRandomValues" | "randomUUID">> | undefined;

function toHex(byte: number) {
    return byte.toString(16).padStart(2, "0");
}

function createFallbackUuid(randomSource: RandomSource) {
    const bytes = new Uint8Array(16);

    if (randomSource?.getRandomValues) {
        randomSource.getRandomValues(bytes);
    } else {
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
        }
    }

    // Set UUID v4 variant/version bits when we fall back to raw bytes.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, toHex).join("");

    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
    ].join("-");
}

export function createRandomId(randomSource: RandomSource = globalThis.crypto) {
    if (randomSource?.randomUUID) {
        return randomSource.randomUUID();
    }

    return createFallbackUuid(randomSource);
}
