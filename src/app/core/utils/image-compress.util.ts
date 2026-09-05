/** Client-side image compression for seal/signature uploads before API save. */

export type CompressImageOptions = {
  maxEdge?: number;
  maxDataUrlChars?: number;
  mimeType?: 'image/png' | 'image/jpeg' | 'image/webp';
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });

/**
 * Compresses an image File to a data URL suitable for hospital settings payloads.
 * Falls back to raw FileReader data URL if canvas compression fails.
 */
export async function compressImageFileToDataUrl(
  file: File,
  options: CompressImageOptions = {}
): Promise<string> {
  const maxEdge = options.maxEdge ?? 512;
  const maxDataUrlChars = options.maxDataUrlChars ?? 900_000;
  const preferredMime = options.mimeType || 'image/png';

  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Unable to decode image'));
        image.src = objectUrl;
      });

      const scale = Math.min(1, maxEdge / Math.max(img.width || 1, img.height || 1));
      const width = Math.max(1, Math.round((img.width || 1) * scale));
      const height = Math.max(1, Math.round((img.height || 1) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas unavailable');
      }
      ctx.drawImage(img, 0, 0, width, height);

      let dataUrl = canvas.toDataURL(preferredMime, preferredMime === 'image/jpeg' ? 0.86 : undefined);
      if (dataUrl.length > maxDataUrlChars) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      }
      if (!dataUrl.startsWith('data:image/')) {
        throw new Error('Compression produced invalid data');
      }
      return dataUrl;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    const fallback = await readFileAsDataUrl(file);
    if (!fallback.startsWith('data:image/')) {
      throw new Error('Invalid image data');
    }
    return fallback;
  }
}
