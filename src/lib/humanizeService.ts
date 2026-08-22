import { GoogleGenAI } from "@google/genai";
import { DEFAULT_MODEL, isModelNotFoundError } from "./models";

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
  timestamp: number;
};

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

/** Same retry-once-on-404 helper used by homeworkService. */
async function withFallback<T>(
  apiKey: string,
  primary: string,
  run: (model: string) => Promise<T>
): Promise<T> {
  try {
    return await run(primary);
  } catch (err) {
    if (primary !== DEFAULT_MODEL && isModelNotFoundError(err)) {
      console.warn(`[humanize] Model "${primary}" unavailable, retrying with "${DEFAULT_MODEL}"`);
      return await run(DEFAULT_MODEL);
    }
    throw err;
  }
}

export async function humanizeText(
  text: string,
  style: HumanizeStyle,
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<HumanizeResult> {
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

  const response = await withFallback<any>(apiKey, model, (m) =>
    ai.models.generateContent({
      model: m,
      contents: prompt,
    })
  );

  return {
    original: text,
    humanized: response.text || text,
    style,
    timestamp: Date.now(),
  };
}
