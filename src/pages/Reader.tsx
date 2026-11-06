import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useContentError, useLibrary } from '../content/SiteContext';
import { audioUrl, isReadable, loadAlignment, loadChapter } from '../content/loaders';
import type { Alignment, Book, ChapterText, Library } from '../content/types';
import {
  bookmarksKey,
  defaultPrefs,
  positionKey,
  PREFS_KEY,
  readList,
  readRaw,
  readStore,
  writeStore,
  type Bookmark,
  type ReaderMode,
  type ReaderPrefs,
  type ReadingPosition,
} from '../lib/storage';
import { ReaderCtx, type NavTarget, type Panel, type ReaderState, type SleepTimer } from '../reader/ReaderContext';
import { useNarration } from '../reader/useNarration';
import { ClassicReader, isTyping } from '../reader/ClassicReader';
import { ImmersiveReader } from '../reader/ImmersiveReader';
import { AudioPlayer } from '../reader/AudioPlayer';
import { BookmarksPanel, ChapterNav, SettingsPanel } from '../reader/Panels';
import { Logo } from '../components/Logo';
import { PageLoader } from '../components/PageLoader';
import NotFound from './NotFound';
import { pad2 } from '../lib/format';

export default function ReaderPage() {
  const { slug } = useParams();
  const lib = useLibrary();
  const err = useContentError();
  if (!lib) return err ? <NotFound /> : <PageLoader />;
  const book = lib.books.find((b) => b.slug === slug);
  if (!book || !isReadable(book)) return <NotFound message="This book is not available to read yet." />;
  return <ReaderShell key={book.slug} lib={lib} book={book} />;
}

function ReaderShell({ lib, book }: { lib: Library; book: Book }) {
  const [params, setParams] = useSearchParams();
  const saved = useMemo(() => readRaw<ReadingPosition>(positionKey(book.slug)), [book.slug]);

  // ── initial chapter & mode (URL wins, then saved position) ──
  const initial = useMemo(() => {
    const qch = params.get('ch');
    let idx = qch ? book.chapters.findIndex((c) => c.id === qch) : -1;
    let target: NavTarget | null = null;
    let audioTime: number | undefined;
    if (idx < 0 && saved) idx = book.chapters.findIndex((c) => c.id === saved.chapterId);
    if (idx < 0) idx = 0;
    if (saved && saved.chapterId === book.chapters[idx].id) {
      if (saved.sentenceId) target = { sentenceId: saved.sentenceId };
      audioTime = saved.audioTime;
    }
    const qm = params.get('mode');
    const mode: ReaderMode = qm === 'listen' || qm === 'classic' ? qm : saved?.mode ?? 'classic';
    return { idx, target, audioTime, mode };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [chapterIndex, setChapterIndex] = useState(initial.idx);
  const [mode, setModeState] = useState<ReaderMode>(initial.mode);
  const [text, setText] = useState<ChapterText | null>(null);
  const [alignment, setAlignment] = useState<Alignment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prefs, setPrefsState] = useState<ReaderPrefs>(() => readStore(PREFS_KEY, defaultPrefs));
  const [anchorId, setAnchorId] = useState<string | null>(initial.target?.sentenceId ?? null);
  const [follow, setFollow] = useState(true);
  const [chapterFraction, setChapterFraction] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => readList(bookmarksKey(book.slug)));
  const [sleep, setSleep] = useState<SleepTimer>({ kind: 'off' });
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState<string | null>(null);
  const targetRef = useRef<NavTarget | null>(initial.target);

  const chapter = book.chapters[chapterIndex];

  // ── load chapter text + alignment (only the current chapter) ──
  useEffect(() => {
    let live = true;
    setText(null);
    setAlignment(null);
    setLoadError(null);
    Promise.all([loadChapter(book, chapter), loadAlignment(book, chapter)])
      .then(([t, a]) => {
        if (!live) return;
        setAlignment(a);
        setText(t);
      })
      .catch(() => live && setLoadError('This chapter could not be loaded. Please check your connection and try again.'));
    return () => {
      live = false;
    };
  }, [book, chapter]);

  // only trust alignment segments whose ids exist in the text
  const { segments, wordSentences } = useMemo(() => {
    if (!alignment || !text) return { segments: [], wordSentences: new Set<string>() };
    const byId = new Map(text.paragraphs.flatMap((p) => p.sentences).map((s) => [s.id, s.text]));
    const segs = alignment.segments.filter((s) => byId.has(s.id)).sort((a, b) => a.begin - b.begin);
    const words = new Set<string>();
    segs.forEach((s) => {
      const tokens = byId.get(s.id)!.trim().split(/\s+/).length;
      if (s.words && s.words.length === tokens) words.add(s.id);
    });
    return { segments: segs, wordSentences: words };
  }, [alignment, text]);

  // ── narration ──
  const sleepRef = useRef(sleep);
  sleepRef.current = sleep;
  const goToChapterRef = useRef<(i: number, t?: NavTarget, autoplay?: boolean) => void>(() => {});
  const onEnded = useCallback(() => {
    if (sleepRef.current.kind === 'chapter') {
      setSleep({ kind: 'off' });
      return;
    }
    if (chapterIndex < book.chapters.length - 1) goToChapterRef.current(chapterIndex + 1, undefined, true);
  }, [chapterIndex, book.chapters.length]);

  const src = audioUrl(lib, book, chapter);
  const narration = useNarration({
    src,
    chapterKey: chapter.id,
    segments,
    startAt: chapter.audioStart,
    endAt: chapter.audioEnd,
    rate: prefs.rate,
    onEnded,
  });

  // restore saved audio position once
  const restored = useRef(false);
  if (!restored.current) {
    restored.current = true;
    // ?autoplay=1 (e.g. the homepage "Listen" button) — the tap that navigated here allows playback
    const autoplay = params.get('autoplay') === '1';
    if (initial.audioTime || autoplay) narration.queue({ time: initial.audioTime, autoplay });
  }

  const activeSeg = narration.activeIndex >= 0 ? segments[narration.activeIndex] : undefined;
  const activeId = activeSeg?.id ?? null;

  // ── sleep timer ──
  useEffect(() => {
    if (sleep.kind !== 'minutes') return;
    const id = window.setTimeout(() => {
      narration.pause();
      setSleep({ kind: 'off' });
    }, Math.max(0, sleep.until - Date.now()));
    return () => window.clearTimeout(id);
  }, [sleep, narration]);

  // ── navigation ──
  const goToChapter = useCallback(
    (i: number, target?: NavTarget, autoplay?: boolean) => {
      if (i < 0 || i >= book.chapters.length) return;
      targetRef.current = target ?? null;
      setAnchorId(target?.sentenceId ?? null);
      setFollow(true);
      setChapterFraction(target?.atEnd ? 1 : 0);
      narration.queue({ autoplay: autoplay ?? narration.playing });
      setChapterIndex(i);
      setPanel(null);
    },
    [book.chapters.length, narration],
  );
  goToChapterRef.current = goToChapter;

  const setMode = useCallback(
    (m: ReaderMode) => {
      // keep the place: the new mode opens at the narrated sentence, else the current anchor
      targetRef.current = narration.playing && activeId ? { sentenceId: activeId } : anchorId ? { sentenceId: anchorId } : null;
      setModeState(m);
    },
    [narration.playing, activeId, anchorId],
  );

  const playFrom = useCallback(
    (id: string) => {
      const s = segments.find((x) => x.id === id);
      if (!s) return;
      narration.seek(s.begin);
      setFollow(true);
      narration.play();
    },
    [segments, narration],
  );
  const canPlayFrom = useCallback((id: string) => !!src && segments.some((s) => s.id === id), [src, segments]);

  // ── keep URL in sync (shareable, survives reload) ──
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set('mode', mode);
    next.set('ch', chapter.id);
    next.delete('autoplay');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, chapter.id]);

  // ── persistence ──
  const progress = (chapterIndex + chapterFraction) / book.chapters.length;
  const savePosition = useCallback(() => {
    const a = narration.audio;
    const pos: ReadingPosition = {
      chapterId: chapter.id,
      sentenceId: (narration.playing && activeId) || anchorId || undefined,
      audioTime: a && a.getAttribute('src') && a.currentTime > 0 ? a.currentTime : undefined,
      mode,
      progress,
      updatedAt: Date.now(),
    };
    writeStore(positionKey(book.slug), pos);
  }, [narration, chapter.id, activeId, anchorId, mode, progress, book.slug]);
  const saveRef = useRef(savePosition);
  saveRef.current = savePosition;

  useEffect(() => {
    const id = window.setTimeout(() => saveRef.current(), 400);
    return () => window.clearTimeout(id);
  }, [chapter.id, anchorId, mode, activeId, narration.playing]);
  useEffect(() => {
    const flush = () => saveRef.current();
    const onVis = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const setPrefs = useCallback((p: Partial<ReaderPrefs>) => {
    setPrefsState((cur) => {
      const n = { ...cur, ...p };
      writeStore(PREFS_KEY, n);
      return n;
    });
  }, []);

  // ── bookmarks ──
  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };
  const addBookmark = useCallback(() => {
    const sid = (narration.playing && activeId) || anchorId;
    if (!sid || !text) return;
    if (bookmarks.some((b) => b.chapterId === chapter.id && b.sentenceId === sid)) {
      flash('Already bookmarked');
      return;
    }
    const sentence = text.paragraphs.flatMap((p) => p.sentences).find((s) => s.id === sid);
    const excerpt = (sentence?.text ?? '').slice(0, 120) + ((sentence?.text.length ?? 0) > 120 ? '…' : '');
    const list = [{ chapterId: chapter.id, chapterTitle: text.title, sentenceId: sid, excerpt, createdAt: Date.now() }, ...bookmarks];
    setBookmarks(list);
    writeStore(bookmarksKey(book.slug), list);
    flash('Bookmark added');
  }, [narration.playing, activeId, anchorId, text, bookmarks, chapter.id, book.slug]);
  const removeBookmark = useCallback(
    (b: Bookmark) => {
      const list = bookmarks.filter((x) => x !== b);
      setBookmarks(list);
      writeStore(bookmarksKey(book.slug), list);
    },
    [bookmarks, book.slug],
  );

  // ── global keys ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || panel) return;
      const onButton = (e.target as HTMLElement)?.tagName === 'BUTTON';
      if ((e.key === ' ' && !onButton && mode !== 'classic') || e.key === 'k') {
        e.preventDefault();
        setFollow(true);
        narration.toggle();
      } else if (e.key === 'j') narration.skip(-10);
      else if (e.key === 'l') narration.skip(10);
      else if (e.key === 'b') addBookmark();
      else if (e.key === 'm') setMode(mode === 'classic' ? 'listen' : 'classic');
      else if (mode === 'listen' && e.key === 'ArrowLeft') {
        e.preventDefault();
        narration.skip(-10);
      } else if (mode === 'listen' && e.key === 'ArrowRight') {
        e.preventDefault();
        narration.skip(10);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [narration, addBookmark, setMode, mode, panel]);

  // Media Session (lock-screen controls on phones)
  useEffect(() => {
    const ms = navigator.mediaSession;
    if (!ms || !src) return;
    try {
      ms.metadata = new MediaMetadata({
        title: text?.title ?? chapter.title,
        artist: 'Dr. Lakhdev Singh',
        album: book.title,
        artwork: book.cover ? [{ src: new URL(book.cover, location.href).href }] : [],
      });
      ms.setActionHandler('play', () => narration.play());
      ms.setActionHandler('pause', () => narration.pause());
      ms.setActionHandler('seekbackward', () => narration.skip(-10));
      ms.setActionHandler('seekforward', () => narration.skip(10));
      ms.setActionHandler('previoustrack', chapterIndex > 0 ? () => goToChapter(chapterIndex - 1) : null);
      ms.setActionHandler('nexttrack', chapterIndex < book.chapters.length - 1 ? () => goToChapter(chapterIndex + 1) : null);
    } catch {
      /* unsupported action */
    }
  }, [src, text, chapter.title, book, narration, chapterIndex, goToChapter]);

  useEffect(() => {
    document.title = `${chapter.title} · ${book.title} — Dr. Lakhdev Singh`;
  }, [chapter.title, book.title]);

  const consumeTarget = useCallback(() => {
    const t = targetRef.current;
    targetRef.current = null;
    return t;
  }, []);

  const state: ReaderState = {
    lib,
    book,
    chapterIndex,
    chapter,
    text,
    alignment,
    wordSentences,
    activeId,
    activeWord: activeId && wordSentences.has(activeId) ? narration.activeWord : -1,
    narration,
    mode,
    setMode,
    prefs,
    setPrefs,
    anchorId,
    setAnchorId,
    target: targetRef.current,
    consumeTarget,
    follow,
    setFollow,
    goToChapter,
    playFrom,
    canPlayFrom,
    progress,
    setChapterFraction,
    bookmarks,
    addBookmark,
    removeBookmark,
    sleep,
    setSleep,
    panel,
    setPanel,
  };

  const syncNote = !src
    ? null
    : !alignment
      ? 'Narration is available. Sentence highlighting will appear once alignment data is added for this chapter.'
      : null;

  return (
    <ReaderCtx.Provider value={state}>
      <div
        className={`reader theme-${prefs.theme} mode-${mode}`}
        style={{ ['--fs' as string]: prefs.fontScale }}
      >
        <header className="reader-bar" data-no-drag>
          <Link to={`/books/${book.slug}`} className="reader-back" aria-label={`Back to ${book.title}`}>
            <Logo variant="emblem" badge height={38} />
            <span className="reader-back-label">Library</span>
          </Link>

          <div className="reader-title">
            <span className="reader-book" lang={book.language}>
              {book.title}
            </span>
            <span className="reader-ch" lang={book.language}>
              <em>{pad2(chapterIndex + 1)}</em> {chapter.title}
            </span>
          </div>

          <div className="mode-switch" role="tablist" aria-label="Reading mode">
            <button role="tab" aria-selected={mode === 'classic'} onClick={() => setMode('classic')}>
              <BookIcon /> <span>Book</span>
            </button>
            <button role="tab" aria-selected={mode === 'listen'} onClick={() => setMode('listen')}>
              <WaveIcon /> <span>Listen</span>
            </button>
          </div>

          <div className="reader-tools">
            <button className="icon-btn" onClick={() => setPanel('chapters')} aria-label="Contents" title="Contents">
              <ListIcon />
            </button>
            <button className="icon-btn" onClick={() => setPanel('bookmarks')} aria-label="Bookmarks" title="Bookmarks (B)">
              <BookmarkIcon filled={bookmarks.some((b) => b.chapterId === chapter.id && b.sentenceId === anchorId)} />
            </button>
            <button className="icon-btn" onClick={() => setPanel('settings')} aria-label="Reading settings" title="Settings">
              <span className="aa">Aa</span>
            </button>
          </div>
          <div className="reader-progress" role="progressbar" aria-label="Progress through the book" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
        </header>

        <main className="reader-main" id="main">
          {loadError ? (
            <div className="reader-loading">{loadError}</div>
          ) : mode === 'classic' ? (
            <ClassicReader />
          ) : (
            <ImmersiveReader />
          )}
          {!follow && narration.playing && (
            <button className="follow-pill" onClick={() => setFollow(true)}>
              ↩ Back to narration
            </button>
          )}
        </main>

        <footer className="reader-foot" data-no-drag>
          <div className="reader-foot-meta">
            <button className="chapter-step" onClick={() => goToChapter(chapterIndex - 1)} disabled={chapterIndex === 0} aria-label="Previous chapter">
              ‹ Prev
            </button>
            <span className="reader-pct">
              Ch. {chapterIndex + 1} / {book.chapters.length} · {Math.round(progress * 100)}%
            </span>
            <button className="chapter-step" onClick={() => goToChapter(chapterIndex + 1)} disabled={chapterIndex >= book.chapters.length - 1} aria-label="Next chapter">
              Next ›
            </button>
          </div>
          {mode === 'listen' && syncNote && <p className="sync-note">{syncNote}</p>}
          <AudioPlayer variant={mode === 'listen' ? 'full' : 'compact'} />
        </footer>

        {panel === 'chapters' && <ChapterNav />}
        {panel === 'bookmarks' && <BookmarksPanel />}
        {panel === 'settings' && <SettingsPanel />}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </ReaderCtx.Provider>
  );
}

const BookIcon = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden>
    <path d="M8 2 C 6 0.8, 3 0.8, 1 1.6 V 11 C 3 10.2, 6 10.2, 8 11.2 Z M8 2 C 10 0.8, 13 0.8, 15 1.6 V 11 C 13 10.2, 10 10.2, 8 11.2" />
  </svg>
);
const WaveIcon = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden>
    <path d="M1 6 h1 M4 3.5 v5 M7 1 v10 M10 3 v6 M13 4.5 v3 M15 6 h0" />
  </svg>
);
const ListIcon = () => (
  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
    <path d="M5 1.5 H17 M5 7 H17 M5 12.5 H17" />
    <circle cx="1.6" cy="1.5" r=".9" fill="currentColor" />
    <circle cx="1.6" cy="7" r=".9" fill="currentColor" />
    <circle cx="1.6" cy="12.5" r=".9" fill="currentColor" />
  </svg>
);
const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg width="14" height="18" viewBox="0 0 14 18" stroke="currentColor" strokeWidth="1.2" fill={filled ? 'currentColor' : 'none'} aria-hidden>
    <path d="M1 1 H13 V17 L7 12.5 L1 17 Z" />
  </svg>
);
