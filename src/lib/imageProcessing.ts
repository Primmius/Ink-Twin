import { BoundingBox } from "../types";

export async function processCharacterImage(
  source: HTMLImageElement | string,
  box: BoundingBox
): Promise<string> {
  const sourceImage = typeof source === 'string' ? await loadImage(source) : source;

  // Convert percentage box to pixels.
  const rawX = (box.x / 100) * sourceImage.width;
  const rawY = (box.y / 100) * sourceImage.height;
  const rawW = (box.width / 100) * sourceImage.width;
  const rawH = (box.height / 100) * sourceImage.height;

  // 1. EXPAND the model's bounding box generously so we don't slice off
  //    any part of the stroke. Gemini's boxes are often tight or shifted.
  const padFrac = 0.35;
  const padX = rawW * padFrac;
  const padY = rawH * padFrac;
  let cropX = Math.max(0, Math.floor(rawX - padX));
  let cropY = Math.max(0, Math.floor(rawY - padY));
  let cropX2 = Math.min(sourceImage.width, Math.ceil(rawX + rawW + padX));
  let cropY2 = Math.min(sourceImage.height, Math.ceil(rawY + rawH + padY));
  let cropW = Math.max(1, cropX2 - cropX);
  let cropH = Math.max(1, cropY2 - cropY);

  // 2. Render the expanded crop into a working canvas at native resolution
  //    so we can analyse the pixels.
  const work = document.createElement('canvas');
  work.width = cropW;
  work.height = cropH;
  const wctx = work.getContext('2d')!;
  wctx.fillStyle = '#FFFFFF';
  wctx.fillRect(0, 0, cropW, cropH);
  wctx.drawImage(sourceImage, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  const wData = wctx.getImageData(0, 0, cropW, cropH);

  // 3. Threshold using an adaptive value. Compute the mean luminance and use
  //    a slightly-below-mean cutoff so faint cursive strokes still register.
  const lum = new Uint8ClampedArray(cropW * cropH);
  let sum = 0;
  for (let i = 0, p = 0; i < wData.data.length; i += 4, p++) {
    const g = 0.299 * wData.data[i] + 0.587 * wData.data[i + 1] + 0.114 * wData.data[i + 2];
    lum[p] = g;
    sum += g;
  }
  const mean = sum / lum.length;
  const threshold = Math.max(80, Math.min(180, mean - 25));

  // 4. Find the tight bounding box of dark (ink) pixels INSIDE the expanded
  //    crop. Ignore a thin border zone to avoid catching grid lines from the
  //    template or from a hand-drawn box.
  const borderIgnore = Math.round(Math.min(cropW, cropH) * 0.05);
  let minX = cropW, minY = cropH, maxX = -1, maxY = -1;
  for (let y = borderIgnore; y < cropH - borderIgnore; y++) {
    for (let x = borderIgnore; x < cropW - borderIgnore; x++) {
      if (lum[y * cropW + x] < threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // 5. Decide which crop to use:
  //    - If we found a sensible ink region, tighten to it.
  //    - If we found nothing, fall back to the model's box.
  //    - If the ink region spans almost the whole expanded crop, the box
  //      probably caught a neighbour or grid border — fall back too.
  let finalX = cropX;
  let finalY = cropY;
  let finalW = cropW;
  let finalH = cropH;

  if (maxX > 0 && maxY > 0) {
    const inkW = maxX - minX + 1;
    const inkH = maxY - minY + 1;
    const fillRatio = (inkW * inkH) / (cropW * cropH);
    if (fillRatio < 0.95 && inkW > 4 && inkH > 4) {
      // Add a small breathing margin around the ink so strokes don't touch the edge.
      const m = Math.round(Math.max(inkW, inkH) * 0.12);
      const tx = Math.max(0, minX - m);
      const ty = Math.max(0, minY - m);
      const tx2 = Math.min(cropW, maxX + m);
      const ty2 = Math.min(cropH, maxY + m);
      finalX = cropX + tx;
      finalY = cropY + ty;
      finalW = tx2 - tx;
      finalH = ty2 - ty;
    }
  }

  // 6. Render to the standard 500x500 output canvas, fitting while preserving
  //    aspect ratio and centering inside a white background.
  const out = document.createElement('canvas');
  out.width = 500;
  out.height = 500;
  const octx = out.getContext('2d')!;
  octx.fillStyle = '#FFFFFF';
  octx.fillRect(0, 0, 500, 500);

  const scale = Math.min(480 / finalW, 480 / finalH);
  const drawW = finalW * scale;
  const drawH = finalH * scale;
  const dx = (500 - drawW) / 2;
  const dy = (500 - drawH) / 2;
  octx.drawImage(sourceImage, finalX, finalY, finalW, finalH, dx, dy, drawW, drawH);

  // 7. Final binarisation pass on the output for clean vectorisation.
  const outData = octx.getImageData(0, 0, 500, 500);
  let outSum = 0;
  for (let i = 0; i < outData.data.length; i += 4) {
    outSum += 0.299 * outData.data[i] + 0.587 * outData.data[i + 1] + 0.114 * outData.data[i + 2];
  }
  const outMean = outSum / (500 * 500);
  const outThreshold = Math.max(80, Math.min(180, outMean - 25));
  for (let i = 0; i < outData.data.length; i += 4) {
    const g = 0.299 * outData.data[i] + 0.587 * outData.data[i + 1] + 0.114 * outData.data[i + 2];
    const v = g > outThreshold ? 255 : 0;
    outData.data[i] = v;
    outData.data[i + 1] = v;
    outData.data[i + 2] = v;
    outData.data[i + 3] = 255;
  }
  octx.putImageData(outData, 0, 0);

  return out.toDataURL('image/png');
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function normalizeManualDrawing(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 500;
  canvas.height = 500;
  
  // Fill white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 500, 500);
  
  // Draw with 2px margin
  ctx.drawImage(img, 0, 0, 500, 500, 2, 2, 496, 496);
  
  return canvas.toDataURL('image/png');
}
