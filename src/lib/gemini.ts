import { GoogleGenAI, Type } from "@google/genai";
import { DetectedCharacter, CHARACTERS_TO_DETECT } from "../types";

export async function analyzeHandwriting(imageData: string, apiKey: string): Promise<DetectedCharacter[]> {
  const ai = new GoogleGenAI({ apiKey });
  
  // Remove data:image/...;base64, prefix
  const base64Data = imageData.split(',')[1];
  
  const prompt = `Analyze this image which may be either a grid template with characters in labeled boxes OR freehand handwritten text on paper. 

If it is a grid template:
- Extract each character from its labeled box
- Use the label to identify what character it is
- Return bounding box for each box cell

If it is freehand handwritten text:
- Find every unique character visible in the image
- For each character pick the single clearest instance
- If the same character appears multiple times pick the cleanest one
- Ignore bleed-through from other pages
- Ignore margin notes and non-character marks
- Ignore ruled lines on the paper

In both cases return JSON only in the format currently used by this application: a JSON array of objects, where each object has "char", "boundingBox" (with x, y, width, height), and "confidence".

Bounding box values must be percentages of total image width and height between 0 and 100.
Return JSON only, no explanation, no markdown.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
            confidence: { type: Type.NUMBER }
          },
          required: ["char", "boundingBox", "confidence"]
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
  If it's freehand, find the cleanest instance of "${char}".
  Return its bounding box as percentages (x, y, width, height) between 0 and 100 and a confidence score. 
  The box should tightly enclose the handwritten stroke.
  If not found, return null. Return as JSON only.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
          confidence: { type: Type.NUMBER }
        },
        required: ["char", "boundingBox", "confidence"]
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
