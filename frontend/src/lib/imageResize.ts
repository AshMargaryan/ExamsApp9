/** Downscales/re-encodes an image file client-side before upload, so an
 * oversized photo never hits the server at full resolution. Non-image files
 * (or anything the canvas can't decode) pass through untouched. */
export async function resizeImageFile(
  file: File, maxDimension = 1600, quality = 0.85,
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000) {
    bitmap.close();
    return file;
  }

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));
  if (!blob) return file;

  const newName = outputType === "image/jpeg" ? file.name.replace(/\.\w+$/, ".jpg") : file.name;
  return new File([blob], newName, { type: outputType });
}
