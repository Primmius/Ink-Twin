import { GoogleGenAI, Type } from "@google/genai";
import { DetectedCharacter, CHARACTERS_TO_DETECT } from "../types";

export async function analyzeHandwriting(imageData: string, apiKey: string): Promise<DetectedCharacter[]> {
  const ai = new GoogleGenAI({ apiKey });
  
  // Remove data:image/...;base64, prefix and detect real MIME type
  const mimeMatch = imageData.match(/^data:([^;]+);base64,/);
  const mimeType = (mimeMatch ? mimeMatch[1] : 'image/jpeg') as string;
  const base64Data = imageData.split(',')[1];
  
  const prompt = `Analyze this image which may be either a grid template with characters in labeled boxes OR freehand handwritten text on paper. 

If it is a grid template:
- Extract each character from its labeled box.
- Use the label to identify what character it is.
- IMPORTANT: The bounding box must ONLY enclose the handwritten stroke. DO NOT include the grid lines, box borders, or the printed labels/characters in the bounding box.

If it is freehand handwritten text:
- Scan the entire image to find every unique character visible.
- For each unique character, pick the SINGLE clearest and cleanest instance.
- If a character appears multiple times, select the one with the best stroke definition and least noise.
- Strictly ignore bleed-through from other pages, ghosting, or background artifacts.
- Ignore margin notes, non-character marks, doodles, or smudges.
- Ignore ruled lines, grid lines, or any background patterns on the paper.

For all characters:
- Analyze the stroke thickness variations. Identify if the stroke width or boldness varies significantly within the character.
- Ensure the bounding box tightly encloses ONLY the handwritten character stroke.

Return JSON only in this format: a JSON array of objects, where each object has:
- "char": the character string
- "boundingBox": {x, y, width, height} as percentages (0-100)
- "confidence": 0-1 score
- "thickness_variation": 0-1 score (0 = perfectly uniform thickness, 1 = extreme variation in stroke width)

Return JSON only, no explanation, no markdown.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
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
  const mimeMatch = imageData.match(/^data:([^;]+);base64,/);
  const mimeType = (mimeMatch ? mimeMatch[1] : 'image/jpeg') as string;
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
        { inlineData: { mimeType, data: base64Data } },
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

  const mimeMatch2 = imageData.match(/^data:([^;]+);base64,/);
  const mimeType2 = (mimeMatch2 ? mimeMatch2[1] : 'image/jpeg') as string;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType2, data: base64Data } },
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
