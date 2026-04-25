import { GoogleGenAI, Type } from "@google/genai";
import { DetectedCharacter, CHARACTERS_TO_DETECT } from "../types";

export async function analyzeHandwriting(imageData: string, apiKey: string): Promise<DetectedCharacter[]> {
  const ai = new GoogleGenAI({ apiKey });
  
  // Remove data:image/...;base64, prefix
  const base64Data = imageData.split(',')[1];
  
  const prompt = `Analyze this image which may be either a grid template with characters in labeled boxes OR freehand handwritten text on paper.

If it is a grid template:
- Extract each handwritten character from its own labeled box.
- Use the small printed label inside each box to identify which character it is.
- The bounding box must enclose ONLY the handwritten stroke. Do not include grid lines, the printed label, or any neighbouring cell.

If it is freehand handwritten text:
- Scan the entire image and find each unique character that appears.
- For each character, pick the SINGLE clearest instance and box only that one glyph.
- Ignore bleed-through, ghosting, doodles, smudges, ruled lines, and margin notes.

RULES for every bounding box:
- Each box must contain EXACTLY ONE handwritten character — not two, not a row, not a column.
- Each box should be a SINGLE CELL in size, not a quadrant of cells.
- Express coordinates as percentages 0–100 of the full image: x and y are the TOP-LEFT corner of the box; width and height are its size.

Return a JSON array of objects, each with:
- "char": the single character string
- "boundingBox": {x, y, width, height} as percentages 0–100
- "confidence": 0.0–1.0
- "thickness_variation": 0.0–1.0 (0 = uniform, 1 = highly variable)

Return JSON only — no markdown, no explanation.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            char: { type: Type.STRING },
            boundingBox: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER }
              },
              required: ["x", "y", "width", "height"]
            },
            confidence: { type: Type.NUMBER },
            thickness_variation: { type: Type.NUMBER }
          },
          required: ["char", "boundingBox", "confidence", "thickness_variation"]
        }
      }
    }
  });

  try {
    const text = response.text;
    if (!text) return [];
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((d: any) => ({ ...d, boundingBox: normalizeBoundingBox(d.boundingBox) }))
      .filter((d: any) => d.boundingBox.width > 0 && d.boundingBox.height > 0);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}

// Gemini's vision models often return bounding boxes in their native
// 0-1000 normalized format (or sometimes 0-1, or pixel coords) regardless
// of the schema we ask for. Detect and rescale every box to a consistent
// {x, y, width, height} 0-100 percentage representation.
function normalizeBoundingBox(box: any): { x: number; y: number; width: number; height: number } {
  if (!box) return { x: 0, y: 0, width: 0, height: 0 };

  // Array form: [ymin, xmin, ymax, xmax] (Gemini default)
  if (Array.isArray(box) && box.length === 4) {
    const [a, b, c, d] = box.map(Number);
    return rescaleCorners(b, a, d, c);
  }

  // Corner form: {y_min, x_min, y_max, x_max} or {ymin, xmin, ymax, xmax}
  const yMin = num(box.y_min ?? box.ymin ?? box.top);
  const xMin = num(box.x_min ?? box.xmin ?? box.left);
  const yMax = num(box.y_max ?? box.ymax ?? box.bottom);
  const xMax = num(box.x_max ?? box.xmax ?? box.right);
  if (yMin !== null && xMin !== null && yMax !== null && xMax !== null) {
    return rescaleCorners(xMin, yMin, xMax, yMax);
  }

  // Size form: {x, y, width, height}
  const x = num(box.x) ?? 0;
  const y = num(box.y) ?? 0;
  const w = num(box.width) ?? 0;
  const h = num(box.height) ?? 0;
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
  if (maxVal <= 1.0001) return 100;     // 0-1 normalized
  if (maxVal <= 100.0001) return 1;     // already percent
  if (maxVal <= 1000.0001) return 0.1;  // 0-1000 (Gemini vision default)
  return 100 / maxVal;                  // raw pixels — best effort
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
- The bounding box should be centred on the handwritten stroke. It is fine to include a little empty cell space around it; we will tighten it later. Do not cross into adjacent cells.

If it is freehand text:
- Find the single clearest instance of "${char}" and box only that one glyph.
- Ignore bleed-through, ruled lines, doodles, smudges, and unrelated marks.

Return ONE JSON object with:
- "char": the string "${char}"
- "boundingBox": {x, y, width, height} as percentages 0–100
- "confidence": 0.0–1.0 (use a low confidence if you are unsure)
- "thickness_variation": 0.0–1.0`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          char: { type: Type.STRING },
          boundingBox: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              width: { type: Type.NUMBER },
              height: { type: Type.NUMBER }
            },
            required: ["x", "y", "width", "height"]
          },
          confidence: { type: Type.NUMBER },
          thickness_variation: { type: Type.NUMBER }
        },
        required: ["char", "boundingBox", "confidence", "thickness_variation"]
      }
    }
  });

  const text = response.text;
  if (!text) return null;
  const parsed = JSON.parse(text);
  if (!parsed || !parsed.boundingBox) return null;
  const boundingBox = normalizeBoundingBox(parsed.boundingBox);
  if (boundingBox.width <= 0 || boundingBox.height <= 0) return null;
  return { ...parsed, boundingBox };
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
   0.0 = fully disconnected print
   1.0 = fully connected cursive

2. slantDegree: -15 to +15 degrees
   Negative = leans left
   Positive = leans right
   0 = upright

3. spacingTightness: 0.0 to 1.0
   0.0 = very wide spacing
   1.0 = very tight spacing

4. baselineDrift: 0.0 to 1.0
   0.0 = perfectly straight baseline
   1.0 = very wavy baseline

5. strokeSmoothness: 0.0 to 1.0
   0.0 = very shaky strokes
   1.0 = very smooth strokes

6. wobble: 0.0 to 1.0
   How much natural variation exists per character position and rotation

7. strokeWeight: 0.5 to 2.0
   0.5 = very thin strokes
   1.0 = normal weight
   2.0 = very thick strokes

8. irregularity: 0.0 to 1.0
   How inconsistent letter sizes and shapes are across the sample

9. inkColor: hex color string
   Best estimate of the ink color from the image

10. letterSpacing: -2 to 5
    Pixels of space between letters
    For cursive this must be 0.3 or less

11. lineHeight: 1.2 to 2.5
    Multiplier for line spacing

12. Pick the single best matching fontFamily from this list only:
    Zeyada, Marck Script, La Belle Aurore, Nothing You Could Do, Kristi, Dancing Script, Satisfy, Allura, Caveat, Handlee, Kalam, Indie Flower, Patrick Hand, Architects Daughter, Gochi Hand, Gloria Hallelujah, Homemade Apple, Just Another Hand, Loved by the King, Waiting for the Sunrise

    Match based on:
    cursive/neat_cursive → pick from first group (Zeyada to Allura)
    hybrid → pick from middle group (Caveat to Handlee)
    print → pick from last group (Kalam to Waiting for the Sunrise)

13. styleLabel: one short phrase describing the handwriting personality
    Example: 'flowing student cursive' or 'neat angular print' or 'quick casual mixed'

Return JSON only. No markdown. No explanation.
Exact format:
{
  "scriptType": string,
  "connectionLevel": number,
  "slantDegree": number,
  "spacingTightness": number,
  "baselineDrift": number,
  "strokeSmoothness": number,
  "wobble": number,
  "strokeWeight": number,
  "irregularity": number,
  "inkColor": string,
  "letterSpacing": number,
  "lineHeight": number,
  "fontFamily": string,
  "styleLabel": string
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scriptType: { type: Type.STRING },
          connectionLevel: { type: Type.NUMBER },
          slantDegree: { type: Type.NUMBER },
          spacingTightness: { type: Type.NUMBER },
          baselineDrift: { type: Type.NUMBER },
          strokeSmoothness: { type: Type.NUMBER },
          wobble: { type: Type.NUMBER },
          strokeWeight: { type: Type.NUMBER },
          irregularity: { type: Type.NUMBER },
          inkColor: { type: Type.STRING },
          letterSpacing: { type: Type.NUMBER },
          lineHeight: { type: Type.NUMBER },
          fontFamily: { type: Type.STRING },
          styleLabel: { type: Type.STRING }
        },
        required: [
          "scriptType", "connectionLevel", "slantDegree", "spacingTightness", 
          "baselineDrift", "strokeSmoothness", "wobble", "strokeWeight", 
          "irregularity", "inkColor", "letterSpacing", "lineHeight", 
          "fontFamily", "styleLabel"
        ]
      }
    }
  });

  try {
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}
