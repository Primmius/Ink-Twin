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
  
  const threshold = 128;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const value = gray > threshold ? 255 : 0;
    
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
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
