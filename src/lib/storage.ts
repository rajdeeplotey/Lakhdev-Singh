/** localStorage helpers — always guarded (private mode / blocked storage must never break reading). */
const PREFIX = 'ls-writer:';

export function readStore<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
export function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function readRaw<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export type ReaderMode = 'classic' | 'listen';

export interface ReadingPosition {
  chapterId: string;
  sentenceId?: string;
  audioTime?: number;
  mode?: ReaderMode;
  /** 0–1 within the book */
  progress?: number;
  updatedAt: number;
}
export interface Bookmark {
  chapterId: string;
  chapterTitle: string;
  sentenceId: string;
  excerpt: string;
  createdAt: number;
}
export interface ReaderPrefs {
  /** 0.85 – 1.6 */
  fontScale: number;
  theme: 'ivory' | 'sepia' | 'night';
  rate: number;
}
export const defaultPrefs: ReaderPrefs = { fontScale: 1, theme: 'ivory', rate: 1 };

export const positionKey = (slug: string) => `pos:${slug}`;
export const bookmarksKey = (slug: string) => `bm:${slug}`;
export const PREFS_KEY = 'prefs';
