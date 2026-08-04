/**
 * Client-side image compression using canvas.
 * Reduz payload de fotos de câmera (5-10MB → 300-800KB) mantendo
 * qualidade visual aceitável para uso clínico.
 *
 * Preserva formato JPG/PNG/WebP. Não toca em HEIC (browsers não decodam)
 * nem em outros tipos (STL/PDF/DICOM/etc).
 */

const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function maybeCompressImage(
  file: File,
  opts: {
    maxWidth?: number;      // default 2400
    maxHeight?: number;     // default 2400
    quality?: number;       // 0-1, default 0.85
    minSizeBytes?: number;  // don't touch small files, default 500KB
  } = {}
): Promise<File> {
  const { maxWidth = 2400, maxHeight = 2400, quality = 0.85, minSizeBytes = 500_000 } = opts;

  if (!COMPRESSIBLE_TYPES.includes(file.type)) return file;
  if (file.size < minSizeBytes) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    if (scale === 1 && file.size < 3_000_000) {
      // No dimensional gain and file already reasonable — skip
      return file;
    }
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, quality)
    );
    if (!blob || blob.size >= file.size) {
      // Compression somehow inflated — return original
      return file;
    }
    return new File([blob], file.name, {
      type: file.type,
      lastModified: Date.now()
    });
  } catch {
    // Any failure (e.g. huge images running OOM) — return original
    return file;
  }
}
