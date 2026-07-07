/**
 * Re-encode a picked image through a canvas so the uploaded pixels match the
 * displayed orientation exactly. Browsers apply EXIF orientation when
 * decoding for display; the re-encoded JPEG carries no orientation tag, so
 * the detection service and every client render agree regardless of how any
 * decoder treats EXIF. A camera photo otherwise reaches the service rotated
 * relative to the marked corners, mirroring or rotating the detected board.
 *
 * Falls back to the original file when decoding or encoding is unavailable.
 */
export async function normalizeImageFile(file: File): Promise<File> {
    if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
        return file;
    }

    try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) {
            bitmap.close();
            return file;
        }
        context.drawImage(bitmap, 0, 0);
        bitmap.close();

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.92)
        );
        if (!blob) return file;

        const baseName = file.name.replace(/\.[^.]+$/, "") || "board";
        return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    } catch {
        return file;
    }
}
