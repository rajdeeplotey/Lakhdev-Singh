import { openBook } from './viewer';
import { useSyncExternalStore } from 'react';

/**
 * The author's narration, played inside the book viewer next to the Heyzine flipbook.
 *
 * The recordings are one file per printed page (public/audio/<slug>/pNNN.mp3, listed in index.json with the
 * matching Heyzine page). While a page is being read aloud, the viewer turns the flipbook to that page, and
 * when the page's file ends the next page starts automatically (also across chapters).
 *
 * Heyzine shows pages as images inside its own frame, so words cannot be highlighted there; the sync is per page.
 * One shared <audio> element is used so phones (iOS) allow playback that was started by a tap.
 */
export interface NarrationPage {
  page: number; // printed page number
  lastPage?: number; // set when one recording reads two printed pages (e.g. 5–6)
  chapter: number;
  heyzinePage: number;
  file: string;
  duration: number;
}
export interface NarrationIndex {
  book: string;
  pages: NarrationPage[];
}
export interface NarrationState {
  slug: string | null;
  index: NarrationIndex | null;
  i: number; // position in index.pages
  open: boolean; // audio bar visible
  playing: boolean;
  time: number;
  duration: number;
  rate: number;
  error: string | null;
}

const RATES = [0.75, 1, 1.25, 1.5] as const;
const posKey = (slug: string) => `ls-writer:listen:${slug}`;
const RATE_KEY = 'ls-writer:listen-rate';

const urls = new Map<string, string>(); // slug → index.json url
const cache = new Map<string, NarrationIndex>();
const loading = new Map<string, Promise<NarrationIndex>>();

let state: NarrationState = { slug: null, index: null, i: 0, open: false, playing: false, time: 0, duration: 0, rate: savedRate(), error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<NarrationState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

function savedRate(): number {
  try {
    const v = Number(localStorage.getItem(RATE_KEY));
    if ((RATES as readonly number[]).includes(v)) return v;
  } catch {
    /* ignore */
  }
  return 1;
}

let audio: HTMLAudioElement | null = null;
let preload: HTMLAudioElement | null = null;
// a restored position is shown 2 s early (to hear the last words again); it is not saved back until the reader plays
// or moves, otherwise every open/close without playing would creep 2 s further back
let holdSave = false;
function el(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'auto';
  audio.addEventListener('timeupdate', () => {
    set({ time: audio!.currentTime });
    if (!holdSave) savePosition();
  });
  audio.addEventListener('durationchange', () => set({ duration: audio!.duration || 0 }));
  audio.addEventListener('play', () => {
    holdSave = false;
    set({ playing: true, error: null });
  });
  audio.addEventListener('pause', () => set({ playing: false }));
  audio.addEventListener('ended', () => {
    if (state.index && state.i < state.index.pages.length - 1) goTo(state.i + 1, 0, true);
    else {
      set({ playing: false });
      clearPosition();
    }
  });
  audio.addEventListener('error', () => set({ playing: false, error: 'load' }));
  return audio;
}

/** Register a book's narration (from books.json) and fetch its small index in the background. */
export function registerNarration(slug: string, url: string | undefined) {
  if (!url || urls.has(slug)) return;
  urls.set(slug, url);
  void loadIndex(slug).catch(() => {});
}
export const hasNarration = (slug: string) => urls.has(slug);

function loadIndex(slug: string): Promise<NarrationIndex> {
  const hit = cache.get(slug);
  if (hit) return Promise.resolve(hit);
  let p = loading.get(slug);
  if (!p) {
    p = fetch(urls.get(slug)!, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`narration index HTTP ${r.status}`);
        return r.json() as Promise<NarrationIndex>;
      })
      .then((ix) => {
        cache.set(slug, ix);
        return ix;
      });
    loading.set(slug, p);
    p.catch(() => loading.delete(slug));
  }
  return p;
}

const fileUrl = (slug: string, file: string) => urls.get(slug)!.replace(/[^/]*$/, '') + file;

function savePosition() {
  if (!state.slug || !state.index) return;
  try {
    localStorage.setItem(posKey(state.slug), JSON.stringify({ page: state.index.pages[state.i].page, t: Math.floor(state.time) }));
  } catch {
    /* ignore */
  }
}
function clearPosition() {
  try {
    if (state.slug) localStorage.removeItem(posKey(state.slug));
  } catch {
    /* ignore */
  }
}
export function savedPosition(slug: string): { page: number; t: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(posKey(slug)) || 'null');
    return v && typeof v.page === 'number' ? v : null;
  } catch {
    return null;
  }
}

function goTo(i: number, t = 0, play = state.playing) {
  if (!state.index || !state.slug) return;
  holdSave = false;
  i = Math.max(0, Math.min(state.index.pages.length - 1, i));
  const pg = state.index.pages[i];
  const a = el();
  const src = fileUrl(state.slug, pg.file);
  if (!a.src.endsWith(src)) {
    a.src = src;
    a.load();
  }
  a.playbackRate = state.rate;
  if (t) {
    const seek = () => {
      a.currentTime = t;
      a.removeEventListener('loadedmetadata', seek);
    };
    if (a.readyState >= 1) a.currentTime = t;
    else a.addEventListener('loadedmetadata', seek);
  }
  set({ i, time: t, duration: pg.duration });
  if (play) void a.play().catch(() => set({ playing: false }));
  // warm up the next page so the hand-over is seamless
  const next = state.index.pages[i + 1];
  if (next) {
    preload ??= new Audio();
    preload.preload = 'auto';
    preload.src = fileUrl(state.slug, next.file);
  }
  updateMediaSession();
}

/**
 * Open the audio bar, PAUSED: the voice never starts by itself — only the play button starts it.
 * Start point: the given Heyzine page if any → else the saved position → else the first narrated page.
 */
export function startListening(slug: string, fromHeyzinePage?: number) {
  const ix = cache.get(slug);
  const begin = (index: NarrationIndex) => {
    let i = 0;
    let t = 0;
    let restored = false;
    if (fromHeyzinePage && fromHeyzinePage > 1) {
      const k = index.pages.findIndex((p) => p.heyzinePage >= fromHeyzinePage);
      i = k < 0 ? 0 : k;
    } else {
      const pos = savedPosition(slug);
      const k = pos ? index.pages.findIndex((p) => p.page === pos.page) : -1;
      if (k >= 0) {
        i = k;
        t = Math.max(0, pos!.t - 2);
        restored = true;
      }
    }
    set({ slug, index, open: true, error: null });
    goTo(i, t, false);
    holdSave = restored;
  };
  if (ix) begin(ix);
  else {
    set({ slug, open: true, error: null });
    loadIndex(slug).then(
      (index) => begin(index),
      () => set({ error: 'load' }),
    );
  }
}

export function togglePlay() {
  const a = el();
  if (a.paused) void a.play().catch(() => set({ playing: false }));
  else a.pause();
}
export const nextPage = () => goTo(state.i + 1, 0);
export const prevPage = () => (state.time > 3 ? seekTo(0) : goTo(state.i - 1, 0));
export function seekTo(t: number) {
  const a = el();
  holdSave = false;
  a.currentTime = Math.max(0, Math.min(t, (a.duration || state.duration) - 0.2));
  set({ time: a.currentTime });
}
export function skip(sec: number) {
  const a = el();
  const t = a.currentTime + sec;
  if (t < 0 && state.i > 0) {
    const prev = state.index!.pages[state.i - 1];
    goTo(state.i - 1, Math.max(0, prev.duration + t));
  } else if (t > (a.duration || state.duration) && state.index && state.i < state.index.pages.length - 1) {
    goTo(state.i + 1, Math.min(5, t - (a.duration || state.duration)));
  } else seekTo(t);
}
/** Page picker: move to the start of the recording at position i of index.pages (keeps playing only if it was playing). */
export function goToIndex(i: number) {
  goTo(i, 0);
}
/** Chapter picker: move to the chapter's first page (keeps playing only if it was playing). */
export function goToChapter(n: number) {
  if (!state.index) return;
  const k = state.index.pages.findIndex((p) => p.chapter === n);
  if (k >= 0) goTo(k, 0);
}
export function cycleRate() {
  const k = RATES.indexOf(state.rate as (typeof RATES)[number]);
  const rate = RATES[(k + 1) % RATES.length];
  el().playbackRate = rate;
  try {
    localStorage.setItem(RATE_KEY, String(rate));
  } catch {
    /* ignore */
  }
  set({ rate });
}
/** Hide the audio bar and stop (position stays saved for "continue" next time). */
export function stopListening() {
  audio?.pause();
  set({ open: false, playing: false });
}

// ── phone lock screen / headphone buttons ──
let meta: { title: string; artist: string; cover: string; chapterTitle: (n: number) => string } | null = null;
export function setNarrationMeta(m: typeof meta) {
  meta = m;
  updateMediaSession();
}
function updateMediaSession() {
  if (!('mediaSession' in navigator) || !state.index || !meta) return;
  const pg = state.index.pages[state.i];
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${meta.chapterTitle(pg.chapter)} · ${pg.page}`,
      artist: meta.artist,
      album: meta.title,
      artwork: [{ src: meta.cover, sizes: '600x849', type: 'image/webp' }],
    });
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => togglePlay());
    ms.setActionHandler('pause', () => togglePlay());
    ms.setActionHandler('previoustrack', () => prevPage());
    ms.setActionHandler('nexttrack', () => nextPage());
    ms.setActionHandler('seekbackward', () => skip(-10));
    ms.setActionHandler('seekforward', () => skip(10));
  } catch {
    /* older browsers */
  }
}

export function useNarration(): NarrationState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

/** Site-wide "Listen / ਸੁਣੋ" buttons: open the book and start the voice in the same tap (needed on iPhone). */
export function listenToBook(slug: string) {
  openBook(slug);
  if (hasNarration(slug)) startListening(slug);
}
