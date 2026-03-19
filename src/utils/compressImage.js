/**
 * Compress an image File using Canvas API before upload.
 * @param {File} file - Original image file
 * @param {number} maxWidth - Max width in pixels (default 1280)
 * @param {number} quality - JPEG quality 0-1 (default 0.6)
 * @returns {Promise<File>} - Compressed File object
 */
export async function compressImage(file, maxWidth = 1280, quality = 0.6) {
  return new Promise((resolve) => {
    // If not an image or already small (<200KB), skip compression
    if (!file.type.startsWith('image/') || file.size < 200 * 1024) {
      return resolve(file);
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression didn't help — use original
            return resolve(file);
          }
          const compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original
    };

    img.src = url;
  });
}
