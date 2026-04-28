// @ts-ignore
import ImageTracer from 'imagetracerjs';

export async function vectorizeImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    ImageTracer.imageToSVG(
      imageSrc,
      (svgString: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const paths = Array.from(doc.querySelectorAll('path'));
        resolve(paths[0]?.getAttribute('d') || "");
      },
      { numberofcolors: 2, viewbox: true }
    );
  });
}
