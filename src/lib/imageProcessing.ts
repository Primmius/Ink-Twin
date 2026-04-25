import { BoundingBox } from "../types";

export async function processCharacterImage(
  source: HTMLImageElement | string,
  box: BoundingBox
): Promise<string> {
  const sourceImage = typeof source === 'string' ? await loadImage(source) : source;

  const pxX = clamp((box.x / 100) * sourceImage.width, 0, sourceImage.width - 1);
  const pxY = clamp((box.y / 100) * sourceImage.height, 0, sourceImage.height - 1);
  const pxW = clamp((box.width / 100) * sourceImage.width, 1, sourceImage.width - pxX);
  const pxH = clamp((box.height / 100) * sourceImage.height, 1, sourceImage.height - pxY);

  const work = document.createElement('canvas');
  work.width = Math.round(pxW);
  work.height = Math.round(pxH);
  const wctx = work.getContext('2d')!;
  wctx.fillStyle = '#FFFFFF';
  wctx.fillRect(0, 0, work.width, work.height);
  wctx.drawImage(sourceImage, pxX, pxY, pxW, pxH, 0, 0, work.width, work.height);

  // Find the handwritten character inside the AI's box AND get a pixel
  // mask of what to keep so we can whitewash neighbouring labels and grid
  // lines from the actual output (not just from the analysis).
  const result = findHandwrittenCharacter(wctx, work.width, work.height);

  // Whitewash everything in the work canvas that isn't part of the chosen
  // character. This removes neighbouring printed labels and any cell-border
  // residue from the FINAL output, not just from the blob analysis.
  if (result?.keepMask) {
    const wImg = wctx.getImageData(0, 0, work.width, work.height);
    const data = wImg.data;
    for (let p = 0, i = 0; p < result.keepMask.length; p++, i += 4) {
      if (!result.keepMask[p]) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
    wctx.putImageData(wImg, 0, 0);
  }

  let srcX = 0, srcY = 0, srcW = work.width, srcH = work.height;
  let srcCanvas: HTMLCanvasElement | HTMLImageElement = work;
  if (result?.bbox) {
    srcX = result.bbox.x;
    srcY = result.bbox.y;
    srcW = result.bbox.w;
    srcH = result.bbox.h;
  } else {
    // No usable mask — fall back to the AI's box on the original image.
    srcCanvas = sourceImage;
    srcX = pxX; srcY = pxY; srcW = pxW; srcH = pxH;
  }

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
  ctx.drawImage(srcCanvas, srcX, srcY, srcW, srcH, dx, dy, drawW, drawH);

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

// Inside the AI's box, find the actual handwritten character. We:
//   1. Build an ink mask with an adaptive threshold.
//   2. Find connected components.
//   3. Throw away grid-line shapes (long, very thin), tiny noise, and the
//      printed label (a small component clinging to a corner).
//   4. Pick the largest remaining component — that's the handwriting.
//   5. Return its tightened bounding box with a small padding margin.
function findHandwrittenCharacter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): { bbox: { x: number; y: number; w: number; h: number }; keepMask: Uint8Array } | null {
  if (w < 8 || h < 8) return null;
  const img = ctx.getImageData(0, 0, w, h).data;

  // Adaptive threshold: dark pixels are anything noticeably below mean.
  let sum = 0;
  const lum = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < img.length; i += 4, p++) {
    const g = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
    lum[p] = g;
    sum += g;
  }
  const mean = sum / lum.length;
  const t = clamp(mean - 25, 70, 180);
  const ink = new Uint8Array(w * h);
  for (let p = 0; p < lum.length; p++) ink[p] = lum[p] < t ? 1 : 0;

  // Erase grid-cell border lines BEFORE blob analysis so they can never
  // be confused with handwriting or accidentally merge with it.
  // We detect lines two ways:
  //   (a) a row/column that is overall mostly dark, or
  //   (b) a row/column that contains a single long contiguous dark run.
  for (let y = 0; y < h; y++) {
    let dark = 0;
    let bestRun = 0, run = 0;
    for (let x = 0; x < w; x++) {
      if (ink[y * w + x]) {
        dark++;
        run++;
        if (run > bestRun) bestRun = run;
      } else {
        run = 0;
      }
    }
    if (dark > w * 0.4 || bestRun > w * 0.5) {
      for (let x = 0; x < w; x++) ink[y * w + x] = 0;
    }
  }
  for (let x = 0; x < w; x++) {
    let dark = 0;
    let bestRun = 0, run = 0;
    for (let y = 0; y < h; y++) {
      if (ink[y * w + x]) {
        dark++;
        run++;
        if (run > bestRun) bestRun = run;
      } else {
        run = 0;
      }
    }
    if (dark > h * 0.4 || bestRun > h * 0.5) {
      for (let y = 0; y < h; y++) ink[y * w + x] = 0;
    }
  }

  // Connected components via flood fill (4-connected).
  const labels = new Int32Array(w * h);
  const components: { id: number; minX: number; minY: number; maxX: number; maxY: number; area: number }[] = [];
  let nextId = 1;
  const stack: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!ink[idx] || labels[idx]) continue;
      const id = nextId++;
      let minX = x, minY = y, maxX = x, maxY = y, area = 0;
      stack.push(idx);
      labels[idx] = id;
      while (stack.length) {
        const i = stack.pop()!;
        const cy = (i / w) | 0;
        const cx = i - cy * w;
        area++;
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;
        if (cx > 0) {
          const n = i - 1;
          if (ink[n] && !labels[n]) { labels[n] = id; stack.push(n); }
        }
        if (cx < w - 1) {
          const n = i + 1;
          if (ink[n] && !labels[n]) { labels[n] = id; stack.push(n); }
        }
        if (cy > 0) {
          const n = i - w;
          if (ink[n] && !labels[n]) { labels[n] = id; stack.push(n); }
        }
        if (cy < h - 1) {
          const n = i + w;
          if (ink[n] && !labels[n]) { labels[n] = id; stack.push(n); }
        }
      }
      components.push({ id, minX, minY, maxX, maxY, area });
    }
  }

  if (components.length === 0) return null;

  const totalArea = w * h;
  const candidates = components.filter(c => {
    const cw = c.maxX - c.minX + 1;
    const ch = c.maxY - c.minY + 1;
    const compArea = cw * ch;

    // Drop tiny noise.
    if (c.area < Math.max(8, totalArea * 0.0008)) return false;

    // Drop grid lines: very thin or stretched the full width/height of the cell.
    const aspect = Math.max(cw, ch) / Math.max(1, Math.min(cw, ch));
    const spansWidth = cw > w * 0.85;
    const spansHeight = ch > h * 0.85;
    if ((spansWidth || spansHeight) && aspect > 6) return false;

    // Drop very sparse fills (a hollow rectangle outline = grid cell border).
    const density = c.area / Math.max(1, compArea);
    if ((spansWidth || spansHeight) && density < 0.08) return false;

    // Drop a tiny printed label hugging a corner. Printed labels are small
    // (≲ ~15% of cell width/height) and sit near a corner.
    const isSmall = cw < w * 0.22 && ch < h * 0.22;
    const cornerMargin = 0.18;
    const hugsLeft = c.minX < w * cornerMargin;
    const hugsRight = c.maxX > w * (1 - cornerMargin);
    const hugsTop = c.minY < h * cornerMargin;
    const hugsBottom = c.maxY > h * (1 - cornerMargin);
    const inCorner = (hugsLeft || hugsRight) && (hugsTop || hugsBottom);
    if (isSmall && inCorner) return false;

    return true;
  });

  let chosen = candidates.length ? candidates : components;

  // Pick by ink-pixel area (the handwriting will dominate after filtering).
  chosen.sort((a, b) => b.area - a.area);
  const main = chosen[0];

  // Also include other surviving components that are nearby — strokes of the
  // same character (e.g. dot of an "i", crossbar of a "t") may form separate
  // components. We are conservative here:
  //   - skip thin-line shapes (high aspect ratio) — those are stray underlines.
  //   - skip components much wider than the main blob (likely a strip, not part of the letter).
  //   - require closeness in BOTH axes, not just euclidean distance.
  const cx = (main.minX + main.maxX) / 2;
  const cy = (main.minY + main.maxY) / 2;
  const mainW = main.maxX - main.minX + 1;
  const mainH = main.maxY - main.minY + 1;
  let minX = main.minX, minY = main.minY, maxX = main.maxX, maxY = main.maxY;
  for (const c of chosen) {
    if (c === main) continue;
    const cw = c.maxX - c.minX + 1;
    const ch = c.maxY - c.minY + 1;
    const aspect = Math.max(cw, ch) / Math.max(1, Math.min(cw, ch));
    if (aspect > 3) continue;             // thin line — skip
    if (cw > mainW * 1.2) continue;       // wider than the letter — skip
    if (ch > mainH * 1.2) continue;       // taller than the letter — skip
    if (c.area < main.area * 0.02) continue; // too tiny to matter
    const ccx = (c.minX + c.maxX) / 2;
    const ccy = (c.minY + c.maxY) / 2;
    const dx = Math.abs(ccx - cx);
    const dy = Math.abs(ccy - cy);
    // Must overlap horizontally with the main blob and be close vertically
    // (typical for dots/accents), or vice versa.
    const horizOverlap = c.maxX >= main.minX && c.minX <= main.maxX;
    const vertOverlap = c.maxY >= main.minY && c.minY <= main.maxY;
    const closeV = dy <= mainH * 0.9;
    const closeH = dx <= mainW * 0.9;
    if (!((horizOverlap && closeV) || (vertOverlap && closeH))) continue;
    if (c.minX < minX) minX = c.minX;
    if (c.minY < minY) minY = c.minY;
    if (c.maxX > maxX) maxX = c.maxX;
    if (c.maxY > maxY) maxY = c.maxY;
  }

  // Tight crop with a tiny padding — the 500x500 output canvas adds the
  // visual breathing room via fit-and-center, so we don't need much here.
  const padX = Math.round((maxX - minX + 1) * 0.04);
  const padY = Math.round((maxY - minY + 1) * 0.04);
  const x0 = clamp(minX - padX, 0, w);
  const y0 = clamp(minY - padY, 0, h);
  const x1 = clamp(maxX + padX + 1, 0, w);
  const y1 = clamp(maxY + padY + 1, 0, h);

  if (x1 - x0 < 4 || y1 - y0 < 4) return null;

  // Build a keep-mask: true for pixels in the chosen blob plus any nearby
  // surviving sub-blobs that passed the same filter above. Everything else
  // (grid lines, printed labels, neighbours, underline strips) is whitewashed.
  const keptIds = new Set<number>([main.id]);
  for (const c of chosen) {
    if (c === main) continue;
    const cw = c.maxX - c.minX + 1;
    const ch = c.maxY - c.minY + 1;
    const aspect = Math.max(cw, ch) / Math.max(1, Math.min(cw, ch));
    if (aspect > 3) continue;
    if (cw > mainW * 1.2) continue;
    if (ch > mainH * 1.2) continue;
    if (c.area < main.area * 0.02) continue;
    const ccx = (c.minX + c.maxX) / 2;
    const ccy = (c.minY + c.maxY) / 2;
    const dx = Math.abs(ccx - cx);
    const dy = Math.abs(ccy - cy);
    const horizOverlap = c.maxX >= main.minX && c.minX <= main.maxX;
    const vertOverlap = c.maxY >= main.minY && c.minY <= main.maxY;
    const closeV = dy <= mainH * 0.9;
    const closeH = dx <= mainW * 0.9;
    if (!((horizOverlap && closeV) || (vertOverlap && closeH))) continue;
    keptIds.add(c.id);
  }
  const keepMask = new Uint8Array(w * h);
  for (let p = 0; p < labels.length; p++) {
    if (keptIds.has(labels[p])) keepMask[p] = 1;
  }

  return { bbox: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, keepMask };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Normalize stroke thickness so every character ends up with the same
// uniform stroke weight, regardless of pen pressure. Skeletonize with
// Zhang-Suen thinning, then re-stroke uniformly via a distance transform.
export async function normalizeStrokeWidth(dataUrl: string, targetRadius = 7): Promise<string> {
  const img = await loadImage(dataUrl);
  const w = img.width;
  const h = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;

  // Binarize: ink = 1, background = 0
  const bin = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < bin.length; p++, i += 4) {
    const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    bin[p] = lum < 180 ? 1 : 0;
  }

  // Quick exit if effectively empty
  let inkCount = 0;
  for (let i = 0; i < bin.length; i++) if (bin[i]) inkCount++;
  if (inkCount < 20) return dataUrl;

  const skel = zhangSuenThin(bin, w, h);

  // Distance transform from skeleton (Chamfer 8-connected, weight 1)
  const dist = new Float32Array(w * h);
  for (let i = 0; i < skel.length; i++) dist[i] = skel[i] ? 0 : Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (dist[p] === 0) continue;
      let m = dist[p];
      if (x > 0) m = Math.min(m, dist[p - 1] + 1);
      if (y > 0) m = Math.min(m, dist[p - w] + 1);
      if (x > 0 && y > 0) m = Math.min(m, dist[p - w - 1] + 1);
      if (x < w - 1 && y > 0) m = Math.min(m, dist[p - w + 1] + 1);
      dist[p] = m;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x;
      if (dist[p] === 0) continue;
      let m = dist[p];
      if (x < w - 1) m = Math.min(m, dist[p + 1] + 1);
      if (y < h - 1) m = Math.min(m, dist[p + w] + 1);
      if (x < w - 1 && y < h - 1) m = Math.min(m, dist[p + w + 1] + 1);
      if (x > 0 && y < h - 1) m = Math.min(m, dist[p + w - 1] + 1);
      dist[p] = m;
    }
  }

  // Paint output: pixels within targetRadius of the skeleton become ink
  const out = ctx.createImageData(w, h);
  const od = out.data;
  for (let p = 0, i = 0; p < dist.length; p++, i += 4) {
    const ink = dist[p] <= targetRadius;
    od[i] = od[i + 1] = od[i + 2] = ink ? 0 : 255;
    od[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL('image/png');
}

function zhangSuenThin(src: Uint8Array, w: number, h: number): Uint8Array {
  const a = new Uint8Array(src);
  const idx = (x: number, y: number) => y * w + x;
  let changed = true;
  let iter = 0;
  while (changed && iter < 100) {
    changed = false;
    iter++;
    for (let pass = 0; pass < 2; pass++) {
      const toRemove: number[] = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = idx(x, y);
          if (!a[p]) continue;
          const p2 = a[idx(x, y - 1)];
          const p3 = a[idx(x + 1, y - 1)];
          const p4 = a[idx(x + 1, y)];
          const p5 = a[idx(x + 1, y + 1)];
          const p6 = a[idx(x, y + 1)];
          const p7 = a[idx(x - 1, y + 1)];
          const p8 = a[idx(x - 1, y)];
          const p9 = a[idx(x - 1, y - 1)];
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let A = 0;
          for (let i = 0; i < 8; i++) if (!seq[i] && seq[i + 1]) A++;
          if (A !== 1) continue;
          if (pass === 0) {
            if (p2 && p4 && p6) continue;
            if (p4 && p6 && p8) continue;
          } else {
            if (p2 && p4 && p8) continue;
            if (p2 && p6 && p8) continue;
          }
          toRemove.push(p);
        }
      }
      if (toRemove.length > 0) {
        changed = true;
        for (const p of toRemove) a[p] = 0;
      }
    }
  }
  return a;
}

export async function downscaleForAnalysis(dataUrl: string, maxDim = 1600, quality = 0.9): Promise<string> {
  const img = await loadImage(dataUrl);
  const longest = Math.max(img.width, img.height);
  if (longest <= maxDim) {
    if (dataUrl.startsWith('data:image/jpeg')) return dataUrl;
  }
  const scale = Math.min(1, maxDim / longest);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function normalizeManualDrawing(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 500;
  canvas.height = 500;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 500, 500);
  ctx.drawImage(img, 0, 0, 500, 500, 2, 2, 496, 496);
  return canvas.toDataURL('image/png');
}
