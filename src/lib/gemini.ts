import { GoogleGenAI } from "@google/genai";
import { DetectedCharacter } from "../types";

export async function analyzeHandwriting(imageData: string, apiKey: string): Promise<DetectedCharacter[]> {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = imageData.split(',')[1];

  const prompt = `Analyze this image (grid template or freehand). 
  Extract each character. The bounding box must ONLY enclose the handwritten stroke. 
  DO NOT include grid lines, box borders, or printed labels.
  Return JSON: [{ "char": string, "boundingBox": {"x": number, "y": number, "w": number, "h": number}, "confidence": number }]
  All bounding box values are percentages from 0 to 100 of the full image dimensions.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        { text: prompt }
      ]
    },
    config: { responseMimeType: "application/json" }
  });

  try {
    const text = response.text;
    if (!text) return [];
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d: any) => d.char && d.boundingBox)
      .map((d: any) => ({
        char: d.char,
        confidence: d.confidence ?? 0.8,
        thickness_variation: d.thickness_variation ?? 0,
        boundingBox: normalizeBoundingBox(d.boundingBox),
      }))
      .filter((d: any) => d.boundingBox.width > 0 && d.boundingBox.height > 0);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}

function normalizeBoundingBox(box: any): { x: number; y: number; width: number; height: number } {
  if (!box) return { x: 0, y: 0, width: 0, height: 0 };

  // Array form: [ymin, xmin, ymax, xmax] (Gemini default)
  if (Array.isArray(box) && box.length === 4) {
    const [a, b, c, d] = box.map(Number);
    return rescaleCorners(b, a, d, c);
  }

  // Corner form: {y_min, x_min, y_max, x_max}
  const yMin = num(box.y_min ?? box.ymin ?? box.top);
  const xMin = num(box.x_min ?? box.xmin ?? box.left);
  const yMax = num(box.y_max ?? box.ymax ?? box.bottom);
  const xMax = num(box.x_max ?? box.xmax ?? box.right);
  if (yMin !== null && xMin !== null && yMax !== null && xMax !== null) {
    return rescaleCorners(xMin, yMin, xMax, yMax);
  }

  // Size form: {x, y, w, h} or {x, y, width, height}
  const x = num(box.x) ?? 0;
  const y = num(box.y) ?? 0;
  const w = num(box.w ?? box.width) ?? 0;
  const h = num(box.h ?? box.height) ?? 0;
  const scale = inferScale(Math.max(x, y, x + w, y + h));
  return { x: x * scale, y: y * scale, width: w * scale, height: h * scale };
}

function rescaleCorners(x1: number, y1: number, x2: number, y2: number) {
  const scale = inferScale(Math.max(x1, y1, x2, y2));
  return {
    x: x1 * scale,
    y: y1 * scale,
    width: (x2 - x1) * scale,
    height: (y2 - y1) * scale,
  };
}

function inferScale(maxVal: number): number {
  if (!isFinite(maxVal) || maxVal <= 0) return 1;
  if (maxVal <= 1.0001) return 100;
  if (maxVal <= 100.0001) return 1;
  if (maxVal <= 1000.0001) return 0.1;
  return 100 / maxVal;
}

function num(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function reanalyzeSpecificCharacter(char: string, imageData: string, apiKey: string): Promise<DetectedCharacter | null> {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = imageData.split(',')[1];

  const prompt = `Find the handwritten character "${char}" in this image.
The image may be a grid template or freehand handwriting.

If it is a grid template:
- Locate the cell whose PRINTED label (small letter in the top-left of the cell) is exactly "${char}".
- The handwritten stroke INSIDE THAT SAME CELL is the one to box. NEVER take the stroke from a neighbouring cell.

If it is freehand text:
- Find the single clearest instance of "${char}" and box only that one glyph.

Return ONE JSON object: { "char": "${char}", "boundingBox": {"x": number, "y": number, "w": number, "h": number}, "confidence": number }
All bounding box values are percentages 0-100 of the full image.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        { text: prompt }
      ]
    },
    config: { responseMimeType: "application/json" }
  });

  try {
    const text = response.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (!parsed || !parsed.boundingBox) return null;
    const boundingBox = normalizeBoundingBox(parsed.boundingBox);
    if (boundingBox.width <= 0 || boundingBox.height <= 0) return null;
    return {
      char: parsed.char ?? char,
      confidence: parsed.confidence ?? 0.8,
      thickness_variation: parsed.thickness_variation ?? 0,
      boundingBox,
    };
  } catch (e) {
    console.error("Failed to parse Gemini reanalysis response", e);
    return null;
  }
}

export async function analyzeHandwritingForFontMatch(imageData: string, apiKey: string): Promise<any> {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = imageData.split(',')[1];

  const prompt = `You are an expert handwriting analyst.
Analyze this handwriting image extremely carefully.

Classify the script into EXACTLY one of:
- cursive: all letters connected, flowing
- neat_cursive: connected, consistent, elegant
- hybrid: mix of connected and disconnected
- messy_cursive: connected but irregular and fast
- print: all letters disconnected, blocky

Then study these specific characteristics:

1. connectionLevel: 0.0 to 1.0
2. slantDegree: -15 to +15 degrees
3. spacingTightness: 0.0 to 1.0
4. baselineDrift: 0.0 to 1.0
5. strokeSmoothness: 0.0 to 1.0
6. wobble: 0.0 to 1.0
7. strokeWeight: 0.5 to 2.0
8. irregularity: 0.0 to 1.0
9. inkColor: hex color string
10. letterSpacing: -2 to 5
11. lineHeight: 1.2 to 2.5
12. fontFamily: pick one from: Zeyada, Marck Script, La Belle Aurore, Nothing You Could Do, Kristi, Dancing Script, Satisfy, Allura, Caveat, Handlee, Kalam, Indie Flower, Patrick Hand, Architects Daughter, Gochi Hand, Gloria Hallelujah, Homemade Apple, Just Another Hand, Loved by the King, Waiting for the Sunrise
13. styleLabel: one short phrase describing the handwriting personality

Return JSON only. No markdown. No explanation.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        { text: prompt }
      ]
    },
    config: { responseMimeType: "application/json" }
  });

  try {
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}
