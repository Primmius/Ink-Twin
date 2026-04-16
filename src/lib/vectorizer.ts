// @ts-ignore
import ImageTracer from 'imagetracerjs';

export async function vectorizeImage(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // ImageTracer.imageToSVG( url, callback, options )
      ImageTracer.imageToSVG(
        imageSrc,
        (svgString: string) => {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, 'image/svg+xml');
            const paths = Array.from(doc.querySelectorAll('path'));
            
            // Filter paths to find only the "ink" (black paths)
            const inkPaths = paths.filter(path => {
              const fill = path.getAttribute('fill')?.toLowerCase() || '';
              const d = path.getAttribute('d') || '';
              
              // 1. Only keep black paths
              const isBlack = fill.includes('rgb(0,0,0)') || fill === '#000000' || fill === 'black';
              if (!isBlack) return false;

              // 2. Skip if it's the background square
              // We check if the path is a simple rectangle covering the full area
              // ImageTracer background paths are usually very simple
              const isFullSquare = d.length < 150 && 
                                  (d.includes('0 0') || d.includes('0,0')) && 
                                  (d.includes('500 0') || d.includes('500,0')) && 
                                  (d.includes('500 500') || d.includes('500,500')) && 
                                  (d.includes('0 500') || d.includes('0,500'));
              
              if (isFullSquare) return false;

              return true;
            });

            if (inkPaths.length > 0) {
              // Join only the ink paths
              resolve(inkPaths.map(p => p.getAttribute('d')).join(' '));
            } else {
              // If filtering removed everything, try to find a non-background path
              // In a 2-color trace, the second path is usually the ink if the first is background
              const fallbackPath = paths.find(p => {
                const d = p.getAttribute('d') || '';
                return !(d.includes('0 0') && d.includes('500 500'));
              });
              resolve(fallbackPath?.getAttribute('d') || "");
            }
          } catch (e) {
            reject(e);
          }
        },
        { 
          ltres: 0.5, 
          qtres: 0.5, 
          pathomit: 8,
          strokewidth: 0,
          viewbox: true,
          colorsampling: 0,
          numberofcolors: 2,
          pal: [{r:0,g:0,b:0,a:255}, {r:255,g:255,b:255,a:255}],
          background: 1 // Skip the second color in palette (white)
        }
      );
    } catch (e) {
      reject(e);
    }
  });
}
