import { createContext, useContext } from 'react';
import type { Alignment, Book, ChapterRef, ChapterText, Library } from '../content/types';
import type { Bookmark, ReaderMode, ReaderPrefs } from '../lib/storage';
import type { Narration } from './useNarration';

export interface NavTarget {
  sentenceId?: string;
  atEnd?: boolean;
}

export type SleepTimer = { kind: 'off' } | { kind: 'minutes'; until: number } | { kind: 'chapter' };

export interface ReaderState {
  lib: Library;
  book: Book;
  chapterIndex: number;
  chapter: ChapterRef;
  text: ChapterText | null;
  alignment: Alignment | null;
  /** Sentence ids that have word timings whose count matches the text tokens. */
  wordSentences: Set<string>;
  activeId: string | null;
  activeWord: number;
  narration: Narration;
  mode: ReaderMode;
  setMode: (m: ReaderMode) => void;
  prefs: ReaderPrefs;
  setPrefs: (p: Partial<ReaderPrefs>) => void;
  /** First sentence currently in view — the reading position used across mode switches. */
  anchorId: string | null;
  setAnchorId: (id: string | null) => void;
  /** Consumed by the active reader once the chapter text has rendered. */
  target: NavTarget | null;
  consumeTarget: () => NavTarget | null;
  follow: boolean;
  setFollow: (f: boolean) => void;
  goToChapter: (index: number, target?: NavTarget) => void;
  playFrom: (sentenceId: string) => void;
  canPlayFrom: (sentenceId: string) => boolean;
  progress: number;
  setChapterFraction: (f: number) => void;
  bookmarks: Bookmark[];
  addBookmark: () => void;
  removeBookmark: (b: Bookmark) => void;
  sleep: SleepTimer;
  setSleep: (s: SleepTimer) => void;
  panel: Panel;
  setPanel: (p: Panel) => void;
}
export type Panel = null | 'chapters' | 'bookmarks' | 'settings';

export const ReaderCtx = createContext<ReaderState | null>(null);
export function useReader() {
  const c = useContext(ReaderCtx);
  if (!c) throw new Error('useReader outside ReaderCtx');
  return c;
}
