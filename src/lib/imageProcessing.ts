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

  const out = document.createElement('canvas');
  out.width = 500;
  out.height = 500;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 500, 500);

  const scale = Math.min(496 / pxW, 496 / pxH);
  const drawW = pxW * scale;
  const drawH = pxH * scale;
  const dx = (500 - drawW) / 2;
  const dy = (500 - drawH) / 2;
  ctx.drawImage(sourceImage, pxX, pxY, pxW, pxH, dx, dy, drawW, drawH);

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

  const bin = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < bin.length; p++, i += 4) {
    const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    bin[p] = lum < 180 ? 1 : 0;
  }

  let inkCount = 0;
  for (let i = 0; i < bin.length; i++) if (bin[i]) inkCount++;
  if (inkCount < 20) return dataUrl;

  const skel = zhangSuenThin(bin, w, h);

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

  const outImg = ctx.createImageData(w, h);
  const od = outImg.data;
  for (let p = 0, i = 0; p < dist.length; p++, i += 4) {
    const ink = dist[p] <= targetRadius;
    od[i] = od[i + 1] = od[i + 2] = ink ? 0 : 255;
    od[i + 3] = 255;
  }
  ctx.putImageData(outImg, 0, 0);
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
