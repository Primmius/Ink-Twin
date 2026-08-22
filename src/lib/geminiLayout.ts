import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_MODEL, isModelNotFoundError } from "./models";

/**
 * Note: AI Layout features have been moved to inline components in HandwritingWriter.tsx
 * for better control over the user experience and specific instruction passing.
 * These functions remain as historical reference or potential future utilities.
 */

async function withFallback<T>(
  _apiKey: string,
  primary: string,
  run: (model: string) => Promise<T>
): Promise<T> {
  try {
    return await run(primary);
  } catch (err) {
    if (primary !== DEFAULT_MODEL && isModelNotFoundError(err)) {
      console.warn(`[geminiLayout] Model "${primary}" unavailable, retrying with "${DEFAULT_MODEL}"`);
      return await run(DEFAULT_MODEL);
    }
    throw err;
  }
}

export async function smartTextFitting(
  text: string,
  config: { width: number; height: number; fontSize: number; lineHeight: number; leftMargin: number; topMargin: number },
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Given a page of ${config.width}x${config.height} pixels, font size ${config.fontSize}px, line height ${config.lineHeight}px, left margin ${config.leftMargin}px, top margin ${config.topMargin}px — calculate exactly how many characters and lines fit per page and split this text into pages accordingly. 
  
  Text to split:
  """
  ${text}
  """
  
  Return JSON with an array of page content strings. No markdown, no explanation.`;

  const response = await withFallback<any>(apiKey, model, (m) =>
    ai.models.generateContent({
      model: m,
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
    })
  );

  try {
    const parsed = JSON.parse(response.text || '{}');
    return parsed.pages || [text];
  } catch {
    return [text];
  }
}
