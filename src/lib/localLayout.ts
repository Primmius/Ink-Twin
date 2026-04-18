
/**
 * Local utility for wrapping text into pages without calling an AI.
 * This is faster, more predictable, and fills pages efficiently.
 */

export interface LayoutConfig {
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  leftMargin: number;
  topMargin: number;
  wordSpacing: number;
  letterSpacing: number;
  paragraphSpacing: number;
}

export function wrapTextIntoPages(text: string, config: LayoutConfig, fontName: string): string[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [text];

  ctx.font = `${config.fontSize}px "${fontName}"`;
  
  const maxWidth = config.width - (config.leftMargin * 2);
  const maxHeight = config.height - (config.topMargin * 2);
  
  const pages: string[] = [];
  let currentPageLines: string[] = [];
  let currentY = 0;
  let currentLineHeight = config.lineHeight;

  const paragraphs = text.split('\n\n'); // Split by double newline to match CanvasPage.tsx

  paragraphs.forEach((paragraph, pIdx) => {
    const lines = paragraph.split('\n');
    
    lines.forEach((line, lIdx) => {
      // Handle tags that affect layout
      if (line.includes('[BREAK]')) {
        pages.push(currentPageLines.join('\n'));
        currentPageLines = [];
        currentY = 0;
        return; // Skip rest of this line if it was just a break
      }

      if (line.includes('[LINE:')) {
        const lineMatch = line.match(/\[LINE:(\d+)\]/);
        if (lineMatch) {
          currentLineHeight = parseInt(lineMatch[1]);
        }
      }

      const tempCurrentY = line.includes('[GAP]') ? currentY + currentLineHeight : currentY;
      const effectiveLineHeight = line.includes('[HEADING]') ? currentLineHeight * 1.4 : currentLineHeight;

      let currentIsBold = false;
      const words = line.split(' ');
      let currentLine = '';
      let currentX = 0;

      words.forEach((word, wIdx) => {
        // Tag-aware measurement: Iterate through the word parts
        const wordParts = word.split(/(\[INK:[^\]]+\]|\[SIZE:[^\]]+\]|\[LINE:[^\]]+\]|\[CENTER\]|\[HEADING\]|\[BOLD\]|\[NORMAL\]|\[GAP\])/);
        let wordWidth = 0;

        wordParts.forEach(wp => {
          if (!wp) return;
          if (wp === '[BOLD]') currentIsBold = true;
          else if (wp === '[NORMAL]') currentIsBold = false;
          else if (!wp.startsWith('[')) {
            // Measure actual text
            for (const char of wp) {
              const charWidth = ctx.measureText(char).width + config.letterSpacing;
              // If bold, add the thickness offset (2px as defined in CanvasPage)
              wordWidth += charWidth + (currentIsBold ? 2 : 0);
            }
          }
        });

        // Thickness also affects the spacing if the last character was bold? 
        // Actually, we add it to each character's step in drawTextContent.

        const spacingAdjustment = (currentLine ? ctx.measureText(' ').width + config.wordSpacing : 0);
        
        if (currentLine !== '' && currentX + spacingAdjustment + wordWidth > maxWidth) {
          if (currentY + effectiveLineHeight > maxHeight) {
            pages.push(currentPageLines.join('\n'));
            currentPageLines = [];
            currentY = 0;
          }
          currentPageLines.push(currentLine);
          currentY += effectiveLineHeight;
          currentLine = word;
          currentX = wordWidth;
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
          currentX += spacingAdjustment + wordWidth;
        }
      });

      // Add the last line of the line split
      if (currentLine) {
        if (currentY + effectiveLineHeight > maxHeight) {
          pages.push(currentPageLines.join('\n'));
          currentPageLines = [];
          currentY = 0;
        }
        currentPageLines.push(currentLine);
        currentY += effectiveLineHeight;
        currentLine = '';
      }
    });

    // Add paragraph spacing after each paragraph (except if it's the last one in the text)
    if (pIdx < paragraphs.length - 1) {
      if (currentY + config.paragraphSpacing > maxHeight) {
        pages.push(currentPageLines.join('\n'));
        currentPageLines = [];
        currentY = 0;
      } else {
        // We add a double newline to the content to preserve paragraph breaks for the renderer
        if (currentPageLines.length > 0) {
          currentPageLines[currentPageLines.length - 1] += '\n';
        }
        currentY += config.paragraphSpacing;
      }
    }
  });

  if (currentPageLines.length > 0) {
    pages.push(currentPageLines.join('\n'));
  }

  return pages.length > 0 ? pages : [''];
}
