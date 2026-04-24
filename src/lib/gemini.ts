import { GoogleGenAI, Type } from "@google/genai";
import { DetectedCharacter, CHARACTERS_TO_DETECT } from "../types";

export async function analyzeHandwriting(imageData: string, apiKey: string): Promise<DetectedCharacter[]> {
  const ai = new GoogleGenAI({ apiKey });
  
  // Remove data:image/...;base64, prefix
  const base64Data = imageData.split(',')[1];
  
  const prompt = `You are an OCR engine extracting handwritten characters from a photo of paper.

The image is ONE of these three layouts — auto-detect which:

(A) PRINTED TEMPLATE: an A4 grid with printed labels (e.g. "A", "B", "1") above or beside each box, and a handwritten character drawn inside each box.

(B) HAND-DRAWN GRID: the user drew their own boxes (rectangles, squares, circles) on plain or ruled paper using pen/pencil. There may or may not be printed/written labels.
    - If there ARE handwritten labels next to each box, use them.
    - If there are NO labels at all, identify each character by RECOGNIZING it visually (OCR). Assume the user wrote in a sensible order (e.g. A B C ... Z, then a b c ... z, then 0 1 2 ... 9), but do not rely on order — recognize each character from its actual shape.

(C) FREEHAND PAGE: handwritten letters, words, or sentences on plain or ruled paper, no boxes. Scan the whole image and pick the single clearest instance of each unique character you can find.

EXTRACTION RULES (apply to all three layouts):
- Detect every character you can confidently identify from this set:
  A-Z, a-z, 0-9, and the punctuation . ! ? ' " ( ) - / @ # ,
- For each character, return ONE bounding box that TIGHTLY encloses ONLY the handwritten stroke.
- DO NOT include grid lines, hand-drawn box borders, ruled paper lines, printed labels, or any neighbouring character inside the bounding box.
- Ignore bleed-through from other pages, ghosting, smudges, doodles, margin notes, and background patterns.
- If a character appears multiple times, pick the SINGLE cleanest, clearest instance.
- Distinguish carefully between visually similar pairs: O vs 0, I vs l vs 1, S vs 5, Z vs 2, B vs 8, C vs c, K vs k, P vs p, S vs s, U vs u, V vs v, W vs w, X vs x, Y vs y, Z vs z. Use box position, label, or relative size as tiebreakers.
- Set confidence honestly: low (<0.4) if the character or its boundary is uncertain.

Return a JSON ARRAY of objects, each with:
- "char": the single character string (case-sensitive)
- "boundingBox": {x, y, width, height} as percentages (0-100) of the full image
- "confidence": 0.0-1.0
- "thickness_variation": 0.0-1.0 (0 = perfectly uniform stroke width, 1 = extreme variation)

Return JSON only. No markdown. No explanation.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
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
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}

export async function reanalyzeSpecificCharacter(char: string, imageData: string, apiKey: string): Promise<DetectedCharacter | null> {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = imageData.split(',')[1];
  
  const prompt = `Find the handwritten character "${char}" in this image. 
  The image may be a grid template or freehand text. 
  If it's a grid, look for the box labeled "${char}". 
  If it's freehand, find the single cleanest and clearest instance of "${char}" in the text.
  Ignore distractions like bleed-through, ruled lines, or non-character marks.
  IMPORTANT: The bounding box must ONLY enclose the handwritten stroke. DO NOT include grid lines, box borders, or printed labels.
  Analyze stroke thickness variations for this character.
  Return its bounding box as percentages (x, y, width, height) between 0 and 100, a confidence score, and thickness_variation (0-1).
  The box should tightly enclose ONLY the handwritten stroke.
  If not found, return null. Return as JSON only.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
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

  try {
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
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
    model: "gemini-2.5-flash",
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
