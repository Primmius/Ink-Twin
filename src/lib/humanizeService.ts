import { GoogleGenAI } from "@google/genai";

export type HumanizeStyle =
  | 'student-casual'
  | 'teen-natural'
  | 'formal-essay'
  | 'primary-simple'
  | 'rushed-student';

export type HumanizeResult = {
  original: string;
  humanized: string;
  style: HumanizeStyle;
  modelUsed?: string;
  timestamp: number;
};

export interface GeminiModelOption {
  id: string;
  name: string;
  description: string;
  tag?: string;
  isRecommended?: boolean;
}

export const AVAILABLE_GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Recommended · High speed & natural tone formatting',
    tag: 'Recommended',
    isRecommended: true
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    description: 'Ultra-fast · Highest rate limits & low latency',
    tag: 'Fast & High Quota'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Standard multimodal flash model',
    tag: 'Standard'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Stable legacy fallback model',
    tag: 'Stable'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Deep nuance & rich vocabulary',
    tag: 'Pro Reasoning'
  },
];

export const DEFAULT_HUMANIZE_MODEL = 'gemini-2.5-flash';

const STYLE_PROMPTS: Record<HumanizeStyle, string> = {
  'student-casual': `Rewrite this as a typical student who wrote it themselves. Use natural, slightly informal language. Include occasional minor imperfections like starting a sentence with "So" or "Also". Keep it conversational but on-topic. Don't make it sound perfect.`,
  'teen-natural': `Rewrite this the way a teenager would write it for school. Natural rhythm, simple sentence structures, occasional run-ons. Sounds genuine and unpolished. Avoid complex vocabulary.`,
  'formal-essay': `Rewrite this as a well-written student essay. Formal but not robotic. Sounds like a smart student who knows their stuff. Varied sentence lengths. No overly academic jargon.`,
  'primary-simple': `Rewrite this in a simple, clear style suitable for a primary or junior school student. Short sentences. Basic vocabulary. Enthusiastic tone. Sounds like a young learner wrote it themselves.`,
  'rushed-student': `Rewrite this as if the student was in a hurry — slightly rushed phrasing, a small grammatical quirk or two, and concise sentences. Sounds real, not polished.`,
};

const STYLE_LABELS: Record<HumanizeStyle, string> = {
  'student-casual': 'Student Casual',
  'teen-natural': 'Teen Natural',
  'formal-essay': 'Formal Essay',
  'primary-simple': 'Primary Simple',
  'rushed-student': 'Rushed Student',
};

const STYLE_DESCS: Record<HumanizeStyle, string> = {
  'student-casual': 'Relaxed, real student voice',
  'teen-natural': 'Teenager writing for class',
  'formal-essay': 'Smart but not robotic',
  'primary-simple': 'Young learner, short & clear',
  'rushed-student': 'Looks written in a hurry',
};

export { STYLE_LABELS, STYLE_DESCS };

export async function humanizeText(
  text: string,
  style: HumanizeStyle,
  apiKey: string,
  modelName: string = DEFAULT_HUMANIZE_MODEL
): Promise<HumanizeResult> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("You don't have the API key set up yet. Please set up the API key.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `${STYLE_PROMPTS[style]}

CRITICAL RULES:
- No markdown symbols like **, ##, *, or - for bullets. Use plain text only.
- Keep all factual content and answers accurate — do NOT change the actual information, just the tone and phrasing.
- Do not add a preamble like "Here is the rewritten version:" — just output the rewritten text directly.
- Match the language of the original text exactly (if it is in French, stay in French, etc.).
- Keep the same overall structure and information. Just change the wording and flow to sound human.

TEXT TO HUMANIZE:
${text}`;

  const targetModel = (modelName && modelName.trim()) ? modelName.trim() : DEFAULT_HUMANIZE_MODEL;

  try {
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt,
    });

    return {
      original: text,
      humanized: response.text || text,
      style,
      modelUsed: targetModel,
      timestamp: Date.now(),
    };
  } catch (err: any) {
    console.warn(`Primary humanize call failed with model "${targetModel}":`, err);

    // If model failed (deprecated, 404, or rate limit), try fallback to gemini-2.5-flash or gemini-2.5-flash-lite
    if (targetModel !== 'gemini-2.5-flash' && targetModel !== 'gemini-2.5-flash-lite') {
      try {
        console.log('Attempting automatic fallback to gemini-2.5-flash...');
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return {
          original: text,
          humanized: fallbackRes.text || text,
          style,
          modelUsed: 'gemini-2.5-flash (Fallback)',
          timestamp: Date.now(),
        };
      } catch (fallbackErr) {
        console.error('Fallback model failed too:', fallbackErr);
      }
    }

    throw err;
  }
}
