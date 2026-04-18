import { GoogleGenAI, Type } from "@google/genai";

/**
 * Note: AI Layout features have been moved to inline components in HandwritingWriter.tsx
 * for better control over the user experience and specific instruction passing.
 * These functions remain as historical reference or potential future utilities.
 */

export async function smartTextFitting(
  text: string, 
  config: { width: number; height: number; fontSize: number; lineHeight: number; leftMargin: number; topMargin: number },
  apiKey: string
): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Given a page of ${config.width}x${config.height} pixels, font size ${config.fontSize}px, line height ${config.lineHeight}px, left margin ${config.leftMargin}px, top margin ${config.topMargin}px — calculate exactly how many characters and lines fit per page and split this text into pages accordingly. 
  
  Text to split:
  """
  ${text}
  """
  
  Return JSON with an array of page content strings. No markdown, no explanation.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pages: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["pages"]
      }
    }
  });

  try {
    const text = response.text;
    if (!text) return [text || ''];
    const parsed = JSON.parse(text);
    return parsed.pages || [text];
  } catch (e) {
    console.error("Failed to parse Gemini response for text fitting", e);
    return [text];
  }
}
