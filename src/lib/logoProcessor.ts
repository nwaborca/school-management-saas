/**
 * Client-side HTML5 Canvas School Logo Processor
 * Performs high-precision, zero-dependency background removal via corner flood-fill
 * and trims transparent padding, exporting a crisp PNG Data URL.
 */

export interface ProcessLogoOptions {
  removeBg?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  tolerance?: number; // 0-255 color distance
}

export async function processSchoolLogo(
  file: File | Blob,
  removeBg: boolean = true,
  maxWidth: number = 320,
  maxHeight: number = 320,
  tolerance: number = 38
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image as graphic.'));
      img.onload = () => {
        try {
          // 1. Calculate aspect-ratio preserved bounded dimensions
          let targetWidth = img.naturalWidth || img.width;
          let targetHeight = img.naturalHeight || img.height;

          if (targetWidth > maxWidth || targetHeight > maxHeight) {
            const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
            targetWidth = Math.round(targetWidth * ratio);
            targetHeight = Math.round(targetHeight * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            throw new Error('Canvas 2D context unavailable.');
          }

          // Draw the loaded image onto canvas
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          if (!removeBg) {
            resolve(canvas.toDataURL('image/png'));
            return;
          }

          // 2. Intelligent Corner-Connected Flood Fill Background Removal
          const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const data = imgData.data;

          const getPixel = (x: number, y: number) => {
            const idx = (y * targetWidth + x) * 4;
            return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
          };

          // Sample all 4 corners
          const corners = [
            getPixel(0, 0),
            getPixel(targetWidth - 1, 0),
            getPixel(0, targetHeight - 1),
            getPixel(targetWidth - 1, targetHeight - 1),
          ];

          // Compute average background color from uniform corners
          let totalR = 0, totalG = 0, totalB = 0, count = 0;
          for (const c of corners) {
            // If corner is already transparent, ignore
            if (c[3] > 20) {
              totalR += c[0];
              totalG += c[1];
              totalB += c[2];
              count++;
            }
          }

          // If all corners are transparent already, no need to strip
          if (count === 0) {
            resolve(canvas.toDataURL('image/png'));
            return;
          }

          const bgR = Math.round(totalR / count);
          const bgG = Math.round(totalG / count);
          const bgB = Math.round(totalB / count);

          // Color distance checker (Euclidean color distance)
          const isColorClose = (r: number, g: number, b: number, tol: number) => {
            const dr = r - bgR;
            const dg = g - bgG;
            const db = b - bgB;
            return Math.sqrt(dr * dr + dg * dg + db * db) <= tol;
          };

          // BFS Flood Fill from edges so internal white/light areas inside the crest are strictly preserved
          const visited = new Uint8Array(targetWidth * targetHeight);
          const queue: number[] = [];

          // Seed queue with all border pixels
          for (let x = 0; x < targetWidth; x++) {
            queue.push(x, 0);
            queue.push(x, targetHeight - 1);
            visited[0 * targetWidth + x] = 1;
            visited[(targetHeight - 1) * targetWidth + x] = 1;
          }
          for (let y = 1; y < targetHeight - 1; y++) {
            queue.push(0, y);
            queue.push(targetWidth - 1, y);
            visited[y * targetWidth + 0] = 1;
            visited[y * targetWidth + (targetWidth - 1)] = 1;
          }

          let head = 0;
          while (head < queue.length) {
            const x = queue[head++];
            const y = queue[head++];
            const idx = (y * targetWidth + x) * 4;

            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a === 0 || isColorClose(r, g, b, tolerance)) {
              // Erase background pixel (soft alpha if near tolerance boundary)
              const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
              if (dist <= tolerance * 0.75) {
                data[idx + 3] = 0;
              } else {
                // Soft edge anti-aliasing
                const factor = (dist - tolerance * 0.75) / (tolerance * 0.25);
                data[idx + 3] = Math.round(255 * factor);
              }

              // Check 4-connected neighbors
              const neighbors = [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1],
              ];

              for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < targetWidth && ny >= 0 && ny < targetHeight) {
                  const nIdx = ny * targetWidth + nx;
                  if (!visited[nIdx]) {
                    visited[nIdx] = 1;
                    const neighborPixelIdx = nIdx * 4;
                    const nr = data[neighborPixelIdx];
                    const ng = data[neighborPixelIdx + 1];
                    const nb = data[neighborPixelIdx + 2];
                    const na = data[neighborPixelIdx + 3];

                    if (na === 0 || isColorClose(nr, ng, nb, tolerance)) {
                      queue.push(nx, ny);
                    }
                  }
                }
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);

          // 3. Trim Excess Transparent Margins
          const trimmedCanvas = trimTransparentMargins(canvas);
          resolve(trimmedCanvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Trims excess transparent bounds from canvas
 */
function trimTransparentMargins(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  let foundPixel = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        foundPixel = true;
      }
    }
  }

  if (!foundPixel) return sourceCanvas;

  // Add 4px breathing room padding
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);

  const trimWidth = maxX - minX + 1;
  const trimHeight = maxY - minY + 1;

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimWidth;
  trimmedCanvas.height = trimHeight;

  const trimmedCtx = trimmedCanvas.getContext('2d');
  if (!trimmedCtx) return sourceCanvas;

  trimmedCtx.drawImage(
    sourceCanvas,
    minX,
    minY,
    trimWidth,
    trimHeight,
    0,
    0,
    trimWidth,
    trimHeight
  );

  return trimmedCanvas;
}
