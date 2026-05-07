import { BoundingBox } from "../types";

export async function processCharacterImage(
  source: HTMLImageElement | string,
  box: BoundingBox
): Promise<string> {
  const sourceImage = typeof source === 'string' ? await loadImage(source) : source;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const cropX = (box.x / 100) * sourceImage.width;
  const cropY = (box.y / 100) * sourceImage.height;
  const cropW = (box.width / 100) * sourceImage.width;
  const cropH = (box.height / 100) * sourceImage.height;
  
  canvas.width = 500;
  canvas.height = 500;
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 500, 500);
  
  ctx.drawImage(sourceImage, cropX, cropY, cropW, cropH, 2, 2, 496, 496);
  
  const imageData = ctx.getImageData(0, 0, 500, 500);
  const data = imageData.data;

  // Convert to grayscale first pass to compute Otsu threshold
  const grayVals: number[] = new Array(data.length / 4);
  for (let i = 0; i < data.length; i += 4) {
    grayVals[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Otsu's method: find threshold that minimises intra-class variance
  const histogram = new Array(256).fill(0);
  for (const g of grayVals) histogram[Math.round(g)]++;
  const total = grayVals.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * histogram[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVar) { maxVar = variance; threshold = i; }
  }

  // Apply threshold
  let darkPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const value = grayVals[i / 4] > threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
    if (value === 0) darkPixels++;
  }

  // If more than 50% of pixels are dark the image is inverted — flip it
  if (darkPixels > grayVals.length * 0.5) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  }

  ctx.putImageData(imageData, 0, 0);
  
  return canvas.toDataURL('image/png');
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
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 500, 500);
  
  ctx.drawImage(img, 0, 0, 500, 500, 2, 2, 496, 496);
  
  return canvas.toDataURL('image/png');
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

export async function normalizeStrokeWidth(dataUrl: string): Promise<string> {
  return dataUrl;
}
