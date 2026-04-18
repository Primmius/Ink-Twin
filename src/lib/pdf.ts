import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { CHARACTERS_TO_DETECT } from '../types';

// Initialize PDF.js worker
// Using a reliable CDN for the worker to avoid bundling issues in some environments
// For PDF.js 4.0+, the worker is an ES module (.mjs)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export async function generateTemplatePDF() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const charsPerPage = 20; // 4x5 grid
  const pagesCount = Math.ceil(CHARACTERS_TO_DETECT.length / charsPerPage);
  
  for (let p = 0; p < pagesCount; p++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    
    const margin = 50;
    const cols = 4;
    const rows = 5;
    const cellWidth = (width - 2 * margin) / cols;
    const cellHeight = (height - 2 * margin) / rows;
    
    page.drawText(`HandFont Template - Page ${p + 1}`, {
      x: margin,
      y: height - 30,
      size: 12,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    for (let i = 0; i < charsPerPage; i++) {
      const charIndex = p * charsPerPage + i;
      if (charIndex >= CHARACTERS_TO_DETECT.length) break;
      
      const char = CHARACTERS_TO_DETECT[charIndex];
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = margin + col * cellWidth;
      const y = height - margin - (row + 1) * cellHeight;
      
      // Draw box
      page.drawRectangle({
        x,
        y,
        width: cellWidth - 10,
        height: cellHeight - 10,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });
      
      // Draw label
      page.drawText(char, {
        x: x + 5,
        y: y + cellHeight - 25,
        size: 10,
        font,
        color: rgb(0.7, 0.7, 0.7),
      });
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export async function pdfToText(pdfBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n\n';
  }
  
  return fullText;
}

export async function pdfToImages(pdfBuffer: ArrayBuffer): Promise<string[]> {
  const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  const imageUrls: string[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: context, viewport }).promise;
    imageUrls.push(canvas.toDataURL('image/jpeg', 0.8));
  }
  
  return imageUrls;
}
