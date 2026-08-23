export interface GeminiModelOption {
  id: string;
  name: string;
  description: string;
  tag?: string;
  isRecommended?: boolean;
}

/**
 * Validated Google Gemini API Free-Tier and Production Models
 * Reference: https://ai.google.dev/gemini-api/docs/models/gemini
 */
export const AVAILABLE_GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Recommended · Free Tier · High speed multimodal & reasoning',
    tag: 'Recommended (Free Tier)',
    isRecommended: true
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Production Stable · High Rate Limit (15 RPM / 1M TPM) Free Tier',
    tag: 'Stable (High Quota)'
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash-8B',
    description: 'Ultra-fast lightweight generation with maximum free quota',
    tag: 'High Quota'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    description: 'Cost-efficient & high throughput generation',
    tag: 'Fast & Efficient'
  },
  {
    id: 'gemini-2.0-flash-thinking-exp-01-21',
    name: 'Gemini 2.0 Flash Thinking',
    description: 'Reasoning traces for math, homework & complex multi-step logic',
    tag: 'Thinking Mode'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Deep reasoning, rich nuance & massive 2M token context',
    tag: 'Pro Reasoning'
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Preview)',
    description: 'Original Vision Engine · Fine-grained character & font OCR',
    tag: 'Original Vision OCR'
  }
];

export const DEFAULT_HOMEWORK_MODEL = 'gemini-2.0-flash';
export const DEFAULT_HUMANIZE_MODEL = 'gemini-2.0-flash';
export const DEFAULT_LAYOUT_MODEL = 'gemini-2.0-flash';
export const DEFAULT_VISION_MODEL = 'gemini-3-flash-preview';

/**
 * Returns prioritized fallback chain ensuring zero disruption if target model hits 404/429
 */
export function getFallbackChain(targetModel?: string, isVision: boolean = false): string[] {
  const defaults = isVision
    ? ['gemini-3-flash-preview', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
    : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-3-flash-preview'];
  
  if (!targetModel || !targetModel.trim()) return defaults;
  const clean = targetModel.trim();
  return [clean, ...defaults.filter(m => m !== clean)];
}

export function isModelUnavailableError(err: unknown): boolean {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : (err as any)?.message || JSON.stringify(err) || '';
  const lower = msg.toLowerCase();
  return (
    lower.includes('no longer available') ||
    lower.includes('not found') ||
    lower.includes('404') ||
    lower.includes('model not found') ||
    lower.includes('is not supported') ||
    lower.includes('not_found') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('exceeded your current quota') ||
    lower.includes('503') ||
    lower.includes('overloaded') ||
    lower.includes('unavailable')
  );
}

// Backward compatibility alias
export const isModelNotFoundError = isModelUnavailableError;
