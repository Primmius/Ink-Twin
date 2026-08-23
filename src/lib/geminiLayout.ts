import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_LAYOUT_MODEL, getFallbackChain, isModelUnavailableError } from "./geminiModels";

/**
 * Note: AI Layout features have been moved to inline components in HandwritingWriter.tsx
 * for better control over the user experience and specific instruction passing.
 * These functions remain as historical reference or potential future utilities.
 */

export async function smartTextFitting(
  text: string,
  config: { width: number; height: number; fontSize: number; lineHeight: number; leftMargin: number; topMargin: number },
  apiKey: string,
  modelName: string = DEFAULT_LAYOUT_MODEL
): Promise<string[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("You don't have the API key set up yet. Please set up the API key.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Given a page of ${config.width}x${config.height} pixels, font size ${config.fontSize}px, line height ${config.lineHeight}px, left margin ${config.leftMargin}px, top margin ${config.topMargin}px — calculate exactly how many characters and lines fit per page and split this text into pages accordingly. 
  
  Text to split:
  """
  ${text}
  """
  
  Return JSON with an array of page content strings. No markdown, no explanation.`;

  const fallbackModels = getFallbackChain(modelName, false);
  let responseText = "";
  let lastError: any = null;

  for (const m of fallbackModels) {
    try {
      const response = await ai.models.generateContent({
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
      });
      responseText = response.text || "";
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[geminiLayout] Model "${m}" failed:`, err?.message || err);
      if (!isModelUnavailableError(err)) {
        throw err;
      }
    }
  }

  if (!responseText && lastError) {
    throw lastError;
  }

  try {
    if (!responseText) return [text || ''];
    const parsed = JSON.parse(responseText);
    return parsed.pages || [text];
  } catch (e) {
    console.error("Failed to parse Gemini response for text fitting", e);
    return [text];
  }
}
