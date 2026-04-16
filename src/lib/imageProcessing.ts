import { BoundingBox } from "../types";

export async function processCharacterImage(
  source: HTMLImageElement | string,
  box: BoundingBox
): Promise<string> {
  const sourceImage = typeof source === 'string' ? await loadImage(source) : source;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // 1. Crop and add white border
  const cropX = (box.x / 100) * sourceImage.width;
  const cropY = (box.y / 100) * sourceImage.height;
  const cropW = (box.width / 100) * sourceImage.width;
  const cropH = (box.height / 100) * sourceImage.height;
  
  canvas.width = 500;
  canvas.height = 500;
  
  // Fill white background first
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 500, 500);
  
  // Draw cropped and resized with a 2px margin to ensure ink doesn't touch edges
  ctx.drawImage(sourceImage, cropX, cropY, cropW, cropH, 2, 2, 496, 496);
  
  const imageData = ctx.getImageData(0, 0, 500, 500);
  const data = imageData.data;
  
  // 2. Grayscale & 3. Threshold
  // We'll use a simple Otsu-like threshold or fixed threshold
  const threshold = 128;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    // Strictly black ink (0) and white background (255)
    const value = gray > threshold ? 255 : 0;
    
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255; // Ensure full opacity
  }
  
  // 4. Noise removal (simple median filter or similar could be added, 
  // but for now let's just put back the data)
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
  
  // Fill white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 500, 500);
  
  // Draw with 2px margin
  ctx.drawImage(img, 0, 0, 500, 500, 2, 2, 496, 496);
  
  return canvas.toDataURL('image/png');
}
