import { BoundingBox } from "../types";

export async function processCharacterImage(
  source: HTMLImageElement | string,
  box: BoundingBox
): Promise<string> {
  const sourceImage = typeof source === 'string' ? await loadImage(source) : source;

  // 1. Convert percentage box to pixels and clamp to image bounds.
  let pxX = Math.max(0, (box.x / 100) * sourceImage.width);
  let pxY = Math.max(0, (box.y / 100) * sourceImage.height);
  let pxW = Math.max(1, (box.width / 100) * sourceImage.width);
  let pxH = Math.max(1, (box.height / 100) * sourceImage.height);
  pxW = Math.min(pxW, sourceImage.width - pxX);
  pxH = Math.min(pxH, sourceImage.height - pxY);

  // 2. Render the AI's box at native resolution so we can analyse it.
  const work = document.createElement('canvas');
  work.width = Math.round(pxW);
  work.height = Math.round(pxH);
  const wctx = work.getContext('2d')!;
  wctx.fillStyle = '#FFFFFF';
  wctx.fillRect(0, 0, work.width, work.height);
  wctx.drawImage(sourceImage, pxX, pxY, pxW, pxH, 0, 0, work.width, work.height);

  // 3. If the AI's box is way too large for one character (more than ~15% of
  //    the image in any dimension), it almost certainly caught neighbours.
  //    Tighten to the densest cluster of dark ink inside the crop.
  const wIsBig = box.width > 15 || box.height > 15;
  const tight = wIsBig ? findDensestInkCluster(wctx, work.width, work.height) : null;
  let srcX = pxX, srcY = pxY, srcW = pxW, srcH = pxH;
  if (tight) {
    srcX = pxX + tight.x;
    srcY = pxY + tight.y;
    srcW = tight.w;
    srcH = tight.h;
  }

  // 4. Render to the standard 500x500 output, fitting and centering while
  //    preserving aspect ratio (don't distort the character).
  const out = document.createElement('canvas');
  out.width = 500;
  out.height = 500;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 500, 500);

  const scale = Math.min(496 / srcW, 496 / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const dx = (500 - drawW) / 2;
  const dy = (500 - drawH) / 2;
  ctx.drawImage(sourceImage, srcX, srcY, srcW, srcH, dx, dy, drawW, drawH);

  // 5. Binarise the output.
  const imageData = ctx.getImageData(0, 0, 500, 500);
  const data = imageData.data;
  const threshold = 128;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const v = gray > threshold ? 255 : 0;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  return out.toDataURL('image/png');
}

// When the AI box is too large, look for the single densest cluster of dark
// pixels (one character) inside it and return its bounding box. We slide a
// window roughly the size of one character across the crop and pick the
// position with the highest ink density.
function findDensestInkCluster(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): { x: number; y: number; w: number; h: number } | null {
  const img = ctx.getImageData(0, 0, w, h).data;
  // Build a binary "ink" mask using an adaptive threshold.
  const lum = new Uint8ClampedArray(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < img.length; i += 4, p++) {
    const g = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
    lum[p] = g;
    sum += g;
  }
  const mean = sum / lum.length;
  const t = Math.max(80, Math.min(180, mean - 20));

  // Build cumulative integral of ink pixels for fast windowed sums.
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < lum.length; i++) ink[i] = lum[i] < t ? 1 : 0;
  const integ = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += ink[y * w + x];
      integ[(y + 1) * (w + 1) + (x + 1)] = integ[y * (w + 1) + (x + 1)] + row;
    }
  }
  const winSum = (x1: number, y1: number, x2: number, y2: number) =>
    integ[y2 * (w + 1) + x2] - integ[y1 * (w + 1) + x2] - integ[y2 * (w + 1) + x1] + integ[y1 * (w + 1) + x1];

  // Window dimensions: assume one character is roughly half the crop or less.
  const winW = Math.max(20, Math.floor(w * 0.5));
  const winH = Math.max(20, Math.floor(h * 0.5));
  const step = Math.max(2, Math.floor(Math.min(winW, winH) / 8));

  let best = -1;
  let bx = 0, by = 0;
  for (let y = 0; y + winH <= h; y += step) {
    for (let x = 0; x + winW <= w; x += step) {
      const s = winSum(x, y, x + winW, y + winH);
      if (s > best) { best = s; bx = x; by = y; }
    }
  }
  if (best <= 0) return null;

  // Tighten to the dark pixels inside the chosen window.
  let minX = winW, minY = winH, maxX = -1, maxY = -1;
  for (let y = by; y < by + winH; y++) {
    for (let x = bx; x < bx + winW; x++) {
      if (ink[y * w + x]) {
        if (x - bx < minX) minX = x - bx;
        if (y - by < minY) minY = y - by;
        if (x - bx > maxX) maxX = x - bx;
        if (y - by > maxY) maxY = y - by;
      }
    }
  }
  if (maxX < 0) return { x: bx, y: by, w: winW, h: winH };

  const m = Math.round(Math.max(maxX - minX, maxY - minY) * 0.15);
  const tx = Math.max(0, bx + minX - m);
  const ty = Math.max(0, by + minY - m);
  const tx2 = Math.min(w, bx + maxX + m + 1);
  const ty2 = Math.min(h, by + maxY + m + 1);
  return { x: tx, y: ty, w: tx2 - tx, h: ty2 - ty };
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
