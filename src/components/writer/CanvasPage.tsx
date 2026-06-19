import React, { useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { PageConfig, WriterPage, WriterImage, WriterElement } from '../../types';

interface CanvasPageProps {
  page: WriterPage;
  config: PageConfig;
  fontName: string;
  width?: number;
  height?: number;
  children?: React.ReactNode;
  skipImages?: boolean;
}

export const CanvasPage: React.FC<CanvasPageProps> = ({ 
  page, 
  config, 
  fontName, 
  width = 595, 
  height = 842,
  children,
  skipImages = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCanvasPage(ctx, page, config, fontName, width, height, imageCache.current, skipImages);
  }, [page, config, fontName, width, height, skipImages]);

  return (
    <div 
      className={cn("relative shadow-2xl overflow-hidden", config.pageStyle)} 
      style={{ 
        width, 
        height,
        backgroundColor: config.pageStyle === 'white' ? '#FFFFFF' : 'transparent' 
      }}
    >
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {children}
    </div>
  );
};

export const renderCanvasPage = async (
  ctx: CanvasRenderingContext2D,
  page: WriterPage,
  config: PageConfig,
  fontName: string,
  width: number,
  height: number,
  imageCache: Map<string, HTMLImageElement>,
  skipImages?: boolean
) => {
  // 1. Draw Background
  drawBackground(ctx, width, height, config);

  // 2. Draw Below Layer
  if (!skipImages) {
    for (const img of page.images.filter(i => i.layer === 'below')) {
      await drawImage(ctx, img, imageCache);
    }
  }
  for (const el of page.elements.filter(e => e.layer === 'below')) {
    drawElement(ctx, el, config, fontName);
  }

  // 3. Draw Handwritten Text
  drawText(ctx, page.content, config, fontName, width, height);

  // 4. Draw Above Layer
  if (!skipImages) {
    for (const img of page.images.filter(i => i.layer === 'above')) {
      await drawImage(ctx, img, imageCache);
    }
  }
  for (const el of page.elements.filter(e => e.layer === 'above' || !e.layer)) {
    drawElement(ctx, el, config, fontName);
  }

  // 5. Apply Effects
  applyEffects(ctx, width, height, config.effect);
};

const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number, config: PageConfig) => {
  ctx.save();
  
  // 1. Clear & Base Fill
  ctx.fillStyle = config.pageStyle === 'blackboard' ? '#1a1a1b' : '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // 2. Specific Page Styles
  if (config.pageStyle === 'blackboard') {
    // Sharp chalk grain effect (less blurry)
    ctx.save();
    for (let i = 0; i < 2000; i++) {
      ctx.globalAlpha = Math.random() * 0.1;
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, r, r);
    }
    // Subtle eraser streaks
    ctx.globalAlpha = 0.02;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x, y, 100, 40, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // Scratchy lines
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.05;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 100; i++) {
       ctx.beginPath();
       const x = Math.random() * w;
       const y = Math.random() * h;
       ctx.moveTo(x, y);
       ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
       ctx.stroke();
    }
    ctx.restore();

    // High-quality wooden frame
    ctx.save();
    // Bevel effect
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 0, w, 20); // Top
    ctx.fillRect(0, h-20, w, 20); // Bottom
    ctx.fillRect(0, 0, 20, h); // Left
    ctx.fillRect(w-20, 0, 20, h); // Right
    
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, w-20, h-20);
    ctx.restore();
  }
  if (config.pageStyle === 'paper2') { ctx.fillStyle = '#faf8f5'; ctx.fillRect(0, 0, w, h); }
  if (config.pageStyle === 'note') { ctx.fillStyle = '#fff9c4'; ctx.fillRect(0, 0, w, h); }
  if (config.pageStyle === 'old-paper') { ctx.fillStyle = '#f5e6c8'; ctx.fillRect(0, 0, w, h); }
  if (config.pageStyle === 'birthday') { ctx.fillStyle = '#fff0f5'; ctx.fillRect(0, 0, w, h); }
  if (config.pageStyle === 'love-letter') { ctx.fillStyle = '#fdf6e3'; ctx.fillRect(0, 0, w, h); }
  if (config.pageStyle === 'legal-pad') { ctx.fillStyle = '#fefbd8'; ctx.fillRect(0, 0, w, h); }
  if (config.pageStyle === 'newspaper') { ctx.fillStyle = '#f0eeea'; ctx.fillRect(0, 0, w, h); }
  if (config.pageStyle === 'kraft') { ctx.fillStyle = '#c4a882'; ctx.fillRect(0, 0, w, h); }

  // Indian Project File Paper Styles
  if (['project-floral','project-ocean','project-music','project-colorful','project-purple','project-pink'].includes(config.pageStyle)) {
    const bgFills: Record<string,string> = {
      'project-floral':'#fffef8','project-ocean':'#f8fcff','project-music':'#fdf8ee',
      'project-colorful':'#fffde7','project-purple':'#f3e5f5','project-pink':'#fff5f8',
    };
    ctx.fillStyle = bgFills[config.pageStyle]; ctx.fillRect(0, 0, w, h);

    // Per-style decorations
    if (config.pageStyle === 'project-floral') {
      // Green bottom strip
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(0, h - 58, w, 58);
      // Red inner border
      ctx.strokeStyle = '#c62828'; ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, w - 24, h - 72);
      // Flower at bottom-left
      ctx.save(); ctx.translate(48, h - 29);
      ['#e91e63','#ff5722','#ffc107','#4caf50','#2196f3'].forEach((c, i) => {
        const a = (i * 72 - 90) * Math.PI / 180;
        ctx.beginPath(); ctx.ellipse(Math.cos(a)*14, Math.sin(a)*14, 10, 5, a, 0, Math.PI*2);
        ctx.fillStyle = c; ctx.fill();
      });
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fillStyle = '#ffd740'; ctx.fill();
      ctx.restore();
      // Bird at bottom-right
      ctx.save(); ctx.translate(w - 42, h - 32);
      ctx.fillStyle = '#795548';
      ctx.beginPath(); ctx.arc(0, -5, 7, Math.PI, 0, false); ctx.fill();
      ctx.fillStyle = '#a1887f';
      ctx.beginPath(); ctx.arc(0, -5, 3.5, 0, Math.PI, false); ctx.fill();
      ctx.restore();
    }

    if (config.pageStyle === 'project-ocean') {
      ctx.save();
      ctx.fillStyle = '#1565c0'; ctx.globalAlpha = 0.22;
      ctx.beginPath(); ctx.moveTo(0, h - 72);
      for (let x = 0; x <= w; x += 28) { ctx.quadraticCurveTo(x+14, h-96+Math.sin(x*0.045)*22, x+28, h-72); }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#42a5f5'; ctx.globalAlpha = 0.2;
      ctx.beginPath(); ctx.moveTo(0, h - 44);
      for (let x = 0; x <= w; x += 28) { ctx.quadraticCurveTo(x+14, h-66+Math.sin((x+14)*0.045)*20, x+28, h-44); }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#90caf9'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4;
      ctx.strokeRect(10, 10, w - 20, h - 20); ctx.globalAlpha = 1;
    }

    if (config.pageStyle === 'project-music') {
      ctx.save(); ctx.globalAlpha = 0.09; ctx.fillStyle = '#333'; ctx.font = '26px serif';
      const noteChars = ['♩','♪','♫','♬'];
      [[w-82,140],[w-48,260],[w-86,390],[w-52,510],[w-80,640],[w-46,760]].forEach(([x, y]) => {
        ctx.fillText(noteChars[(x+y)%4], x, y);
      });
      ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#5d4037';
      ctx.beginPath(); ctx.ellipse(w-58, h-88, 36, 46, -0.25, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w-58, h-180, 24, 34, -0.25, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(w-65, h-224, 8, 56);
      ctx.restore();
      ctx.strokeStyle = '#bcaaa4'; ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, w-16, h-16);
      ctx.strokeRect(15, 15, w-30, h-30);
    }

    if (config.pageStyle === 'project-colorful') {
      const cols = ['#f44336','#ff9800','#ffeb3b','#4caf50','#2196f3','#9c27b0'];
      cols.forEach((c, i) => {
        ctx.strokeStyle = c; ctx.lineWidth = 8;
        const s = i * 8 + 4;
        ctx.strokeRect(s, s, w - s*2, h - s*2);
      });
      const inner = cols.length * 8;
      ctx.fillStyle = '#fffde7'; ctx.fillRect(inner, inner, w - inner*2, h - inner*2);
    }

    if (config.pageStyle === 'project-purple') {
      // Side bars + top header
      ctx.fillStyle = '#6a1b9a';
      ctx.fillRect(0, 0, 18, h); ctx.fillRect(w-18, 0, 18, h);
      ctx.fillRect(18, 0, w-36, 98);
      // Flower in purple header
      ctx.save(); ctx.translate(w/2, 49);
      ['#ce93d8','#f48fb1','#fff176','#a5d6a7','#90caf9','#ffcc80'].forEach((c, i) => {
        const a = (i*60)*Math.PI/180;
        ctx.beginPath(); ctx.ellipse(Math.cos(a)*18, Math.sin(a)*18, 12, 7, a, 0, Math.PI*2);
        ctx.fillStyle = c; ctx.fill();
      });
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fillStyle = '#fff176'; ctx.fill();
      ctx.restore();
      // Inner content area fill
      ctx.fillStyle = '#f3e5f5'; ctx.fillRect(18, 98, w-36, h-98);
    }

    if (config.pageStyle === 'project-pink') {
      // Pink frame
      ctx.fillStyle = '#f48fb1';
      ctx.fillRect(0, 0, w, 14); ctx.fillRect(0, h-14, w, 14);
      ctx.fillRect(0, 0, 14, h); ctx.fillRect(w-14, 0, 14, h);
      ctx.fillStyle = '#fff5f8'; ctx.fillRect(14, 14, w-28, h-28);
      ctx.fillStyle = '#e91e63'; ctx.globalAlpha = 0.5; ctx.font = '9px serif';
      for (let i = 28; i < w-28; i += 38) { ctx.fillText('★', i, 10); ctx.fillText('★', i, h-4); }
      ctx.globalAlpha = 1;
      // Cute face bottom-right
      ctx.save(); ctx.translate(w-52, h-52);
      ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.fillStyle = '#ffcc80'; ctx.fill();
      ctx.fillStyle = '#5d4037';
      ctx.beginPath(); ctx.arc(-7,-5,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(7,-5,3,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0,4,9,0.15,Math.PI-0.15); ctx.stroke();
      ctx.restore();
    }

    // Header box (Name / Sub / Page) — all styles except project-purple which has its own
    if (config.pageStyle !== 'project-purple') {
      const hcMap: Record<string,string> = {
        'project-floral':'#2e7d32','project-ocean':'#1565c0',
        'project-music':'#5d4037','project-colorful':'#e65100','project-pink':'#e91e63',
      };
      const hc = hcMap[config.pageStyle] || '#444';
      const hx = 20, hy = 20, hw = w-40, hh = 52;
      ctx.strokeStyle = hc; ctx.lineWidth = 1;
      ctx.strokeRect(hx, hy, hw, hh);
      ctx.beginPath(); ctx.moveTo(hx+hw*0.47, hy); ctx.lineTo(hx+hw*0.47, hy+hh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx+hw*0.73, hy); ctx.lineTo(hx+hw*0.73, hy+hh); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.font = '10px Arial, sans-serif';
      ctx.fillText('Name', hx+7, hy+14); ctx.fillText('Sub', hx+hw*0.48, hy+14); ctx.fillText('Page', hx+hw*0.74, hy+14);
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(hx+5,hy+38); ctx.lineTo(hx+hw*0.46,hy+38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx+hw*0.48,hy+38); ctx.lineTo(hx+hw*0.72,hy+38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx+hw*0.74,hy+38); ctx.lineTo(hx+hw-5,hy+38); ctx.stroke();
    } else {
      // Purple header fields (white on dark)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(28,14,w-56,42);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.5; ctx.strokeRect(28,14,w-56,42);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.moveTo(28+(w-56)*0.47,14); ctx.lineTo(28+(w-56)*0.47,56); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(28+(w-56)*0.73,14); ctx.lineTo(28+(w-56)*0.73,56); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '10px Arial, sans-serif';
      ctx.fillText('Name',36,27); ctx.fillText('Sub',28+(w-56)*0.49,27); ctx.fillText('Page',28+(w-56)*0.75,27);
    }

    // Ruled horizontal lines
    const lColorMap: Record<string,string> = {
      'project-floral':'#3d3d3d','project-ocean':'#1a73e8','project-music':'#555',
      'project-colorful':'#aaaaaa','project-purple':'#8e24aa','project-pink':'#ec407a',
    };
    const lc = lColorMap[config.pageStyle];
    const lineTop    = config.pageStyle === 'project-purple' ? 106 : 82;
    const lineBottom = config.pageStyle === 'project-floral'    ? h - 62
                     : config.pageStyle === 'project-colorful'  ? h - 50 : h - 18;
    const lineRight  = config.pageStyle === 'project-colorful'  ? w - 52
                     : config.pageStyle === 'project-purple'    ? w - 22 : w - 18;

    ctx.strokeStyle = lc; ctx.lineWidth = 0.6;
    for (let y = lineTop; y < lineBottom; y += 30) {
      ctx.beginPath(); ctx.moveTo(config.leftMargin, y); ctx.lineTo(lineRight, y); ctx.stroke();
    }

    // Red/pink margin line (matches existing lined-paper behaviour)
    ctx.strokeStyle = '#ff6666'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(config.leftMargin, lineTop - 4);
    ctx.lineTo(config.leftMargin, lineBottom);
    ctx.stroke();
  }

  // 3. Margin Lines
  const isLined = ['blue-lined', 'gray-lined', 'black-lined', 'legal-pad'].includes(config.pageStyle);
  if (isLined) {
    const lineColor = config.pageStyle === 'blue-lined' ? '#a8c4e0' : 
                      (config.pageStyle === 'black-lined' ? '#333333' : 
                      (config.pageStyle === 'legal-pad' ? '#a8c4e0' : '#cccccc'));
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.5;
    const startY = config.pageStyle === 'legal-pad' ? 100 : 32;
    for (let y = startY; y < h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    
    // Vertical margin line
    if (['blue-lined', 'gray-lined', 'black-lined', 'legal-pad'].includes(config.pageStyle)) {
      ctx.strokeStyle = '#ffaaaa';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(config.leftMargin, 0); ctx.lineTo(config.leftMargin, h); ctx.stroke();
    }
  }

  if (config.pageStyle === 'grid' || config.pageStyle === 'graph-paper') {
    const gap = config.pageStyle === 'grid' ? 25 : 10;
    ctx.strokeStyle = config.pageStyle === 'grid' ? '#e0e0e0' : '#d0e8ff';
    ctx.lineWidth = 0.5;
    for (let y = gap; y < h; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let x = gap; x < w; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  }

  ctx.restore();
};

const getCachedImage = (src: string, cache: Map<string, HTMLImageElement>): Promise<HTMLImageElement> => {
  if (cache.has(src)) return Promise.resolve(cache.get(src)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      const fallback = new Image();
      resolve(fallback);
    };
    img.src = src;
  });
};

const drawImage = async (ctx: CanvasRenderingContext2D, imgData: WriterImage, cache: Map<string, HTMLImageElement>) => {
  const img = await getCachedImage(imgData.src, cache);
  if (!img.width) return;

  ctx.save();
  ctx.translate(imgData.x + imgData.width / 2, imgData.y + imgData.height / 2);
  ctx.rotate((imgData.rotation || 0) * Math.PI / 180);
  ctx.drawImage(img, -imgData.width / 2, -imgData.height / 2, imgData.width, imgData.height);
  ctx.restore();
};

const drawElement = (ctx: CanvasRenderingContext2D, el: WriterElement, config: PageConfig, fontName: string) => {
  ctx.save();
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
  ctx.rotate((el.rotation || 0) * Math.PI / 180);
  
  const width = el.width || 100;
  const height = el.height || 24;

  if (el.type === 'heading') {
    ctx.font = `bold ${el.fontSize || config.fontSize * 1.5}px "${fontName}"`;
    ctx.fillStyle = config.inkColor;
    ctx.fillText(el.content, -width / 2, -height / 2);
  } else if (el.type === 'emoji') {
    ctx.font = `${el.fontSize || 40}px serif`;
    ctx.fillText(el.content, -width / 2, -height / 2);
  } else {
    ctx.font = `${el.fontSize || config.fontSize}px "${fontName}"`;
    ctx.fillStyle = config.inkColor;
    ctx.fillText(el.content, -width / 2, -height / 2);
  }
  
  ctx.restore();
};

const drawText = (ctx: CanvasRenderingContext2D, text: string, config: PageConfig, font: string, w: number, h: number) => {
  if (config.effect === 'shadow') {
    ctx.save();
    ctx.translate(2, 2);
    ctx.globalAlpha = 0.3;
    drawTextContent(ctx, text, config, font, w, h, true);
    ctx.restore();
  }
  drawTextContent(ctx, text, config, font, w, h);
};

const drawTextContent = (ctx: CanvasRenderingContext2D, text: string, config: PageConfig, font: string, w: number, h: number, isShadow?: boolean) => {
  ctx.save();
  
  let currentFontSize = config.fontSize;
  let currentInkColor = config.pageStyle === 'blackboard' ? '#FFFFFF' : config.inkColor;
  let currentThickness = config.thickness;
  let currentLineHeight = config.lineHeight;
  ctx.textBaseline = 'top';

  const paragraphs = text.split('\n\n');
  let cursorY = config.topMargin;

  const rgb = hexToRgb(currentInkColor);

  paragraphs.forEach((paragraph, pIdx) => {
    const lines = paragraph.split('\n');
    lines.forEach((line, lIdx) => {
      let tempLine = line;
      let isCentered = false;
      let isHeading = false;
      let isBoldNext = false;

      if (tempLine.includes('[CENTER]')) { isCentered = true; tempLine = tempLine.replace('[CENTER]', ''); }
      if (tempLine.includes('[GAP]')) { cursorY += currentLineHeight; tempLine = tempLine.replace('[GAP]', ''); }
      if (tempLine.includes('[HEADING]')) { isHeading = true; tempLine = tempLine.replace('[HEADING]', ''); }
      if (tempLine.includes('[LINE:')) {
        const lineMatch = tempLine.match(/\[LINE:(\d+)\]/);
        if (lineMatch) {
          currentLineHeight = parseInt(lineMatch[1]);
          tempLine = tempLine.replace(lineMatch[0], '');
        }
      }

      const lineFontSize = isHeading ? currentFontSize * 1.4 : currentFontSize;
      const eh = isHeading ? currentLineHeight * 1.4 : currentLineHeight;
      ctx.font = `${isHeading ? 'bold ' : ''}${lineFontSize}px "${font}"`;

      // Split by inline tags
      const parts = tempLine.split(/(\[INK:[^\]]+\]|\[SIZE:[^\]]+\]|\[BOLD\]|\[NORMAL\])/);
      
      // Calculate total line width for centering
      let totalLineWidth = 0;
      if (isCentered) {
        let tempThickness = currentThickness;
        parts.forEach(part => {
          if (part === '[BOLD]') {
             tempThickness = config.thickness + 2;
          } else if (part === '[NORMAL]') {
             tempThickness = config.thickness;
          } else if (!part.startsWith('[')) {
            const fontPref = isHeading ? 'bold ' : '';
            ctx.font = `${fontPref}${lineFontSize}px "${font}"`;
            for (const char of part) {
              totalLineWidth += ctx.measureText(char).width + config.letterSpacing;
            }
          }
        });
        totalLineWidth += (tempLine.split(' ').length - 1) * (config.wordSpacing + ctx.measureText(' ').width);
      }

      let cursorX = isCentered ? (w - totalLineWidth) / 2 : config.leftMargin;

      parts.forEach(part => {
        if (part.startsWith('[INK:')) {
          const color = part.match(/\[INK:([^\]]+)\]/)?.[1];
          if (color) {
            currentInkColor = (color === 'black' ? '#000000' : (color === 'blue' ? '#1a1aff' : (color === 'red' ? '#cc0000' : color)));
            if (config.pageStyle === 'blackboard' && color === 'black') currentInkColor = '#FFFFFF';
            if (!isShadow) ctx.fillStyle = currentInkColor;
          }
        } else if (part.startsWith('[SIZE:')) {
          const size = parseInt(part.match(/\[SIZE:([^\]]+)\]/)?.[1] || '');
          if (!isNaN(size)) {
            currentFontSize = size;
            ctx.font = `${currentFontSize}px "${font}"`;
          }
        } else if (part === '[BOLD]') {
          isBoldNext = true;
        } else if (part === '[NORMAL]') {
          currentThickness = config.thickness;
          isBoldNext = false;
        } else {
          const words = part.split(' ');
          const segmentThickness = isBoldNext ? (config.thickness + 2) : currentThickness;
          
          words.forEach((word, wordIdx) => {
            // Apply Ink Variation per word (not for shadow)
            let wordColor = currentInkColor;
            if (config.inkVariation && rgb && !isShadow) {
              const shift = (Math.random() - 0.5) * config.inkVariationIntensity * 30;
              wordColor = `rgb(${Math.min(255, Math.max(0, rgb.r + shift))}, ${Math.min(255, Math.max(0, rgb.g + shift))}, ${Math.min(255, Math.max(0, rgb.b + shift))})`;
              ctx.fillStyle = wordColor;
            } else if (!isShadow) {
              ctx.fillStyle = currentInkColor;
            }

            // Draw Character by Character (Grapheme cluster aware for Indic scripts/Hindi)
            // This prevents "dotted circles" by keeping combining marks with their base
            const clusters = word.match(/[\u0900-\u097F][\u093E-\u094D\u0900-\u0903\u0951-\u0954\u0962-\u0963]*|[^\uD800-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/gu) || Array.from(word);

            clusters.forEach((cluster) => {
              ctx.save();
              
              // Slant
              ctx.transform(1, 0, Math.tan(config.slant * Math.PI / 180), 1, 0, 0);

              // Randomness
              let charOffsetY = 0;
              if (config.naturalRandomness) {
                charOffsetY = (Math.random() - 0.5) * config.randomnessIntensity * 3;
                const rotation = (Math.random() - 0.5) * config.randomnessIntensity * 3;
                ctx.translate(cursorX, cursorY + charOffsetY);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.translate(-cursorX, -(cursorY + charOffsetY));
              }

              // Thickness (draw multiple times with tiny offsets)
              const effectiveThickness = isHeading ? segmentThickness * 1.5 : segmentThickness;
              if (effectiveThickness > 0 && !isShadow) {
                const baseAlpha = ctx.globalAlpha;
                ctx.globalAlpha = 0.3;
                const iterations = Math.floor(effectiveThickness);
                for (let t = 0; t < iterations; t++) {
                  ctx.fillText(cluster, cursorX + (Math.random() * 0.7), cursorY + charOffsetY + (Math.random() * 0.7));
                }
                ctx.globalAlpha = baseAlpha;
              }

              ctx.fillText(cluster, cursorX, cursorY + charOffsetY);
              ctx.restore();
              cursorX += ctx.measureText(cluster).width + config.letterSpacing;
            });
            cursorX += config.wordSpacing + ctx.measureText(' ').width;
          });

          // Reset surgical bold if it was used for this segment
          isBoldNext = false;
        }
      });

      cursorY += eh;
    });
    cursorY += config.paragraphSpacing;
  });
  
  ctx.restore();
};

const applyEffects = (ctx: CanvasRenderingContext2D, w: number, h: number, effect: string) => {
  if (effect === 'shadow') {
    // Already drawn as base for shadow effect in scanner style sometimes? 
    // No, user wants: draw twice. Offset 2px.
    // I should have done this in drawText. Let's fix.
  }

  if (effect === 'scanner') {
    ctx.save();
    ctx.fillStyle = 'rgba(136, 136, 136, 0.08)';
    ctx.fillRect(0, 0, w, h);
    
    // Subtle noise
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 16) { // Every 4th pixel approx
      const noise = (Math.random() - 0.5) * 20;
      data[i] += noise; data[i+1] += noise; data[i+2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);
    ctx.restore();
  }

  if (effect === 'saturate') {
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = 'rgba(255, 200, 100, 0.15)'; // Warm complement-ish
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};
