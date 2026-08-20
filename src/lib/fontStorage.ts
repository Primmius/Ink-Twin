import { SavedFont } from '../types';

const DB_NAME = 'InkTwinFontsDB';
const DB_VERSION = 1;
const STORE_NAME = 'saved_fonts';
const LS_FONTS_KEY = 'handfont_saved_fonts';
const LS_ACTIVE_FONT_KEY = 'inktwin_active_font_id';

export const FONT_EXPIRY_DAYS = 7;
export const FONT_EXPIRY_MS = FONT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Initialize or open the IndexedDB database for font storage.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Calculate remaining days for a font before 7-day auto-expiry.
 */
export function getRemainingDays(createdAt: number): number {
  const elapsed = Date.now() - createdAt;
  const remainingMs = FONT_EXPIRY_MS - elapsed;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

/**
 * Format human-readable expiry label (e.g. "6 days left", "Expires today").
 */
export function formatExpiryLabel(createdAt: number): string {
  const days = getRemainingDays(createdAt);
  if (days <= 0) return 'Expired';
  if (days === 1) return 'Expires today';
  return `${days} days left`;
}

/**
 * Load all saved fonts from IndexedDB (with localStorage fallback & sync).
 * Automatically purges fonts older than 7 days to maintain free browser performance.
 */
export async function loadSavedFonts(): Promise<SavedFont[]> {
  let fonts: SavedFont[] = [];

  try {
    const db = await openDB();
    fonts = await new Promise<SavedFont[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB unavailable, falling back to localStorage', e);
    const raw = localStorage.getItem(LS_FONTS_KEY);
    if (raw) {
      try {
        fonts = JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse localStorage fonts', err);
      }
    }
  }

  // Also check if localStorage has legacy fonts not yet migrated to IndexedDB
  const legacyRaw = localStorage.getItem(LS_FONTS_KEY);
  if (legacyRaw) {
    try {
      const legacyFonts: SavedFont[] = JSON.parse(legacyRaw);
      const existingIds = new Set(fonts.map(f => f.id));
      for (const lf of legacyFonts) {
        if (!existingIds.has(lf.id)) {
          fonts.push(lf);
          saveFontToStorage(lf).catch(() => {});
        }
      }
    } catch {}
  }

  // Apply 7-day auto-expiry filter
  const now = Date.now();
  const validFonts: SavedFont[] = [];
  const expiredIds: string[] = [];

  for (const font of fonts) {
    const created = font.createdAt || now;
    if (now - created < FONT_EXPIRY_MS) {
      validFonts.push({
        ...font,
        createdAt: created,
        expiresAt: font.expiresAt || (created + FONT_EXPIRY_MS)
      });
    } else {
      expiredIds.push(font.id);
    }
  }

  // Asynchronously purge expired fonts from DB and localStorage
  if (expiredIds.length > 0) {
    for (const id of expiredIds) {
      deleteFontFromStorage(id).catch(() => {});
    }
  }

  // Sync lightweight metadata snapshot to localStorage
  syncLocalStorageSnapshot(validFonts);

  return validFonts;
}

/**
 * Save or update a font in IndexedDB & update localStorage snapshot.
 */
export async function saveFontToStorage(font: SavedFont): Promise<void> {
  const normalizedFont: SavedFont = {
    ...font,
    createdAt: font.createdAt || Date.now(),
    expiresAt: font.expiresAt || ((font.createdAt || Date.now()) + FONT_EXPIRY_MS)
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(normalizedFont);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB write failed, writing to localStorage', e);
  }

  // Update localStorage snapshot (strip heavy URLs if quota exceeds)
  try {
    const current = await loadSavedFonts();
    const index = current.findIndex(f => f.id === normalizedFont.id);
    if (index >= 0) {
      current[index] = normalizedFont;
    } else {
      current.push(normalizedFont);
    }
    syncLocalStorageSnapshot(current);
  } catch {}
}

/**
 * Delete a font by ID from storage.
 */
export async function deleteFontFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB delete failed', e);
  }

  const raw = localStorage.getItem(LS_FONTS_KEY);
  if (raw) {
    try {
      const fonts: SavedFont[] = JSON.parse(raw);
      const filtered = fonts.filter(f => f.id !== id);
      syncLocalStorageSnapshot(filtered);
    } catch {}
  }
}

/**
 * Rename a saved font.
 */
export async function renameFontInStorage(id: string, newName: string): Promise<void> {
  try {
    const db = await openDB();
    const font = await new Promise<SavedFont | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (font) {
      font.name = newName;
      await saveFontToStorage(font);
    }
  } catch (e) {
    console.warn('Failed to rename font in IndexedDB', e);
  }
}

/**
 * Sync snapshot to localStorage safely.
 */
function syncLocalStorageSnapshot(fonts: SavedFont[]) {
  try {
    localStorage.setItem(LS_FONTS_KEY, JSON.stringify(fonts));
  } catch (e) {
    // If quota exceeded due to data URLs, store metadata only in localStorage
    try {
      const lightweight = fonts.map(f => ({
        ...f,
        url: f.googleFont ? f.url : '' // strip base64 data URLs in localStorage fallback
      }));
      localStorage.setItem(LS_FONTS_KEY, JSON.stringify(lightweight));
    } catch {}
  }
}

/**
 * Get the currently active font ID from localStorage.
 */
export function getActiveFontId(): string | null {
  return localStorage.getItem(LS_ACTIVE_FONT_KEY);
}

/**
 * Set the currently active font ID in localStorage.
 */
export function setActiveFontId(id: string | null): void {
  if (id) {
    localStorage.setItem(LS_ACTIVE_FONT_KEY, id);
  } else {
    localStorage.removeItem(LS_ACTIVE_FONT_KEY);
  }
}

/**
 * Export / Download a saved handwriting font file to the user's device.
 */
export async function exportFontAsFile(font: SavedFont): Promise<void> {
  const safeName = (font.name || 'handwriting_font').trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  if (font.googleFont) {
    // Export font metadata & profile configuration as JSON
    const data = JSON.stringify(font, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}_inktwin_profile.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // For TTF / custom binary fonts:
  try {
    const res = await fetch(font.url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.ttf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download font file:', err);
    throw new Error('Failed to download font file. Please try again.');
  }
}

/**
 * Import a handwriting font file (.ttf or InkTwin .json backup) into the library.
 * Resets the 7-day retention period for the imported font.
 */
export async function importFontFromFile(file: File): Promise<SavedFont> {
  const fileName = file.name;
  const isJson = fileName.endsWith('.json');
  const isTtf = fileName.endsWith('.ttf') || fileName.endsWith('.otf') || file.type.includes('font');

  if (isJson) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed.name) {
      throw new Error('Invalid InkTwin font configuration file.');
    }
    const newFont: SavedFont = {
      ...parsed,
      id: Math.random().toString(36).substring(2, 11),
      name: parsed.name + ' (Imported)',
      createdAt: Date.now(),
      expiresAt: Date.now() + FONT_EXPIRY_MS,
      source: 'Imported'
    };
    await saveFontToStorage(newFont);
    return newFont;
  }

  if (!isTtf) {
    throw new Error('Unsupported file format. Please upload a .ttf font file or .json InkTwin backup.');
  }

  // Convert TTF file to base64 DataURL for persistent offline storage
  const arrayBuffer = await file.arrayBuffer();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const fontName = fileName.replace(/\.[^/.]+$/, '').trim() || 'Imported Handwriting';
  const newFont: SavedFont = {
    id: Math.random().toString(36).substring(2, 11),
    name: fontName,
    url: base64,
    createdAt: Date.now(),
    expiresAt: Date.now() + FONT_EXPIRY_MS,
    source: 'Imported .TTF'
  };

  // Register font into document.fonts immediately to verify readability
  try {
    const face = new FontFace(`inktwin-font-${newFont.id}`, arrayBuffer);
    const loaded = await face.load();
    document.fonts.add(loaded);
  } catch (err) {
    console.warn('FontFace validation notice during import:', err);
  }

  await saveFontToStorage(newFont);
  return newFont;
}

/**
 * Register and activate a font into document.fonts and return the CSS family name.
 */
export async function registerFontFace(font: SavedFont): Promise<string> {
  if (font.googleFont) {
    const family = font.fontFamily || font.name;
    if (font.url && !document.querySelector(`link[href="${font.url}"]`)) {
      const link = document.createElement('link');
      link.href = font.url;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    const sizes = [12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
    await Promise.all(
      sizes.map(s => document.fonts.load(`${s}px "${family}"`).catch(() => {}))
    );
    return family;
  }

  const family = `inktwin-font-${font.id}`;
  try {
    const res = await fetch(font.url);
    const buffer = await res.arrayBuffer();

    // Check if face already exists and is loaded
    let exists = false;
    document.fonts.forEach(face => {
      if (face.family === family) exists = true;
    });

    if (!exists) {
      const face = new FontFace(family, buffer);
      const loaded = await face.load();
      document.fonts.add(loaded);
    }

    const sizes = [12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
    await Promise.all(
      sizes.map(s => document.fonts.load(`${s}px "${family}"`).catch(() => {}))
    );
    return family;
  } catch (err) {
    console.error(`Failed to register FontFace for ${font.name}:`, err);
    return font.name;
  }
}
