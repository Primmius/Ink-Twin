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
    description: 'Recommended · High speed & natural responses',
    tag: 'Recommended',
    isRecommended: true
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    description: 'Ultra-fast · High rate limits & low latency',
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
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Preview)',
    description: 'Cutting-edge preview model (Best for Vision/OCR)',
    tag: 'Vision/OCR'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Deep nuance & rich reasoning',
    tag: 'Pro Reasoning'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Advanced reasoning & complex problem solving',
    tag: 'Pro Reasoning'
  }
];

export const DEFAULT_HOMEWORK_MODEL = 'gemini-2.5-flash';
export const DEFAULT_HUMANIZE_MODEL = 'gemini-2.5-flash';
export const DEFAULT_LAYOUT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_VISION_MODEL = 'gemini-3-flash-preview';

export function isModelNotFoundError(err: unknown): boolean {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : (err as any)?.message || JSON.stringify(err) || '';
  const lower = msg.toLowerCase();
  return (
    lower.includes('no longer available') ||
    lower.includes('not found') ||
    lower.includes('404') ||
    lower.includes('model not found') ||
    lower.includes('is not supported') ||
    lower.includes('not_found')
  );
}
