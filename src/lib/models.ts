/**
 * Model registry for InkTwin. Single source of truth for which Gemini model
 * each tool calls, plus runtime listing so the user can pick from whatever
 * Google currently offers on the free tier.
 */

export type ModelTier = 'free' | 'paid' | 'unknown';

export type GeminiModel = {
  id: string;            // e.g. "gemini-2.0-flash" — used in API calls
  label: string;         // human-friendly
  tier: ModelTier;
  description?: string;  // one-liner shown in the picker
  free?: boolean;        // shortcut: is this in the free tier?
};

export const STORAGE_KEY = 'geminiModelId';
export const DEFAULT_MODEL = 'gemini-2.0-flash';

/**
 * Curated free-tier-first list. Used as the initial picker options and as
 * the fallback if the live `models.list` endpoint fails or is blocked.
 */
export const CURATED_FREE_MODELS: GeminiModel[] = [
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    tier: 'free',
    free: true,
    description: 'Fast, highly stable & reliable (Recommended)',
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    tier: 'free',
    free: true,
    description: 'Next-gen multimodal reasoning',
  },
  {
    id: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash Lite',
    tier: 'free',
    free: true,
    description: 'Lightweight & ultra fast responses',
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    tier: 'free',
    free: true,
    description: 'High throughput, long context',
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash (Preview)',
    tier: 'free',
    free: true,
    description: 'Cutting edge preview model',
  },
  {
    id: 'gemini-flash-latest',
    label: 'Gemini Flash (Latest)',
    tier: 'free',
    free: true,
    description: 'Always points to newest Flash model',
  },
  {
    id: 'gemini-flash-lite-latest',
    label: 'Gemini Flash Lite (Latest)',
    tier: 'free',
    free: true,
    description: 'Always points to newest Flash Lite model',
  },
];

/** Paid-tier models — shown in the picker if the user expands "All models". */
export const CURATED_PAID_MODELS: GeminiModel[] = [
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'paid', description: 'Best reasoning & complex solving' },
  { id: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro', tier: 'paid', description: 'Advanced reasoning' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', tier: 'paid', description: 'Deep context analysis' },
];

/** Read the persisted model id (or fall back to default). */
export function getStoredModelId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // localStorage may be blocked (private mode, etc.) — fall through
  }
  return DEFAULT_MODEL;
}

export function setStoredModelId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore — next read will just return default
  }
}

/**
 * Fetch the live list of models from Google's API. Returns the curated
 * fallback list if the call fails, is blocked by CORS, or the user hasn't
 * provided an API key yet.
 */
export async function fetchLiveModels(apiKey: string | null): Promise<GeminiModel[]> {
  if (!apiKey) return [...CURATED_FREE_MODELS, ...CURATED_PAID_MODELS];
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw: any[] = Array.isArray(data?.models) ? data.models : [];
    if (raw.length === 0) throw new Error('empty list');

    const live: GeminiModel[] = raw
      // Only models that support generateContent
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      // Only Gemini-family
      .filter((m) => typeof m.name === 'string' && m.name.includes('gemini'))
      .map((m) => {
        const id = String(m.name).replace(/^models\//, '');
        const tier: ModelTier = detectTier(id, m);
        return {
          id,
          label: prettifyLabel(id),
          tier,
          free: tier === 'free',
          description: typeof m.description === 'string' ? m.description : undefined,
        } satisfies GeminiModel;
      });

    if (live.length === 0) throw new Error('no gemini models');

    // Free tier floats to the top
    live.sort((a, b) => {
      if (a.tier === b.tier) return a.label.localeCompare(b.label);
      return a.tier === 'free' ? -1 : 1;
    });

    return live;
  } catch {
    // CORS, network, or auth error — return the curated fallback
    return [...CURATED_FREE_MODELS, ...CURATED_PAID_MODELS];
  }
}

function detectTier(id: string, raw: any): ModelTier {
  const lower = id.toLowerCase();
  if (/\bpro\b/.test(lower) || /ultra|thinking|reasoning/.test(lower)) return 'paid';
  if (/flash/.test(lower)) return 'free';
  const hint = String(raw?.tier || '').toLowerCase();
  if (hint.includes('free')) return 'free';
  if (hint.includes('paid') || hint.includes('premium')) return 'paid';
  return 'unknown';
}

function prettifyLabel(id: string): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Is this error a "model not found" / 404-style failure? Used to trigger
 * the auto-retry-once path before showing the toast/error.
 */
export function isModelNotFoundError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '');
  if (!msg) return false;
  if (/no longer available/i.test(msg)) return true;
  if (/not found/i.test(msg) && /model/i.test(msg)) return true;
  if (/models\/[a-z0-9.\-]+/i.test(msg) && /404|NOT_FOUND/i.test(msg)) return true;
  try {
    const parsed = JSON.parse(msg);
    const code = String(parsed?.error?.code || '');
    const status = String(parsed?.error?.status || '');
    if (code === '404' || status === 'NOT_FOUND') return true;
  } catch {
    // not JSON
  }
  return false;
}
