import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useBooks } from "../content/SiteContext";
import { heyzineUrl } from "../content/books";
import { closeBook, useViewer } from "../lib/viewer";
import { useT } from "../i18n";
import { NarrationBar } from "./NarrationBar";
import { audioTime, hasNarration, narrationAsset, setNarrationMeta, startListening, stopListening, togglePlay, useNarration } from "../lib/narration";
import { heyzinePageRect, heyzineVisiblePages } from "../lib/heyzineLayout";

/**
 * Word highlight. Heyzine's frame belongs to another website, so nothing can be drawn inside it. A see-through layer
 * lies over the frame instead, and one gold marker is placed at: where Heyzine draws the page (heyzineLayout.ts,
 * measured) × where the word is on that page (word box, 0–1). Its timing is the forced alignment of the recording,
 * read against the voice's position every screen frame. Only while the voice plays; nothing shows when paused.
 */
interface SpokenWord {
  w: string;
  s: number; // start, seconds into the recording
  e: number; // end
  p: number; // printed page the word is on
  box: [number, number, number, number]; // x, y, w, h as fractions of that page
}
const wordFiles = new Map<string, Promise<SpokenWord[]>>();
const loadWords = (url: string) => {
  let p = wordFiles.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`words HTTP ${r.status}`);
      return r.json() as Promise<SpokenWord[]>;
    });
    wordFiles.set(url, p);
    p.catch(() => wordFiles.delete(url));
  }
  return p;
};
/** Heyzine's page-turn animation (measured 1.04–1.13 s): the marker waits for it */
const TURN_MS = 1200;
/** after the book (re)loads, Heyzine still draws its pages: the marker waits for that too */
const SETTLE_MS = 1500;
const PAGE_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"];

/**
 * Full-screen Heyzine viewer. The iframe exists only while the viewer is open (fast pages, and the
 * flipbook's sound stops the moment it closes). Close with ✕, Esc or the browser Back button.
 */
/**
 * A− / A+ inside the book. Heyzine shows every page as an image, so the letters cannot be resized on their own;
 * instead the whole book frame is enlarged and Heyzine redraws the pages larger (still sharp). Pages scale evenly,
 * so every line stays exactly where it is on the printed page. The area around the book then scrolls.
 */
const ZOOMS = [1, 1.25, 1.5, 2] as const;
const ZOOM_KEY = "ls-writer:book-zoom";
function savedZoom(): number {
  try {
    const v = Number(localStorage.getItem(ZOOM_KEY));
    if ((ZOOMS as readonly number[]).includes(v)) return v;
  } catch {
    /* storage blocked */
  }
  return 1;
}

/** "ਪੜ੍ਹੋ / Read" → on very small phones only the Punjabi word is shown */
function ModeLabel({ text }: { text: string }) {
  const i = text.indexOf(" / ");
  if (i < 0) return <>{text}</>;
  return (
    <>
      <span lang="pa">{text.slice(0, i)}</span>
      <span className="vm-en">{text.slice(i)}</span>
    </>
  );
}

export function BookViewer() {
  const t = useT();
  const data = useBooks();
  const state = useViewer();
  const book = state && data?.books.find((b) => b.slug === state.slug);
  const [loaded, setLoaded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const src = book ? heyzineUrl(book, state?.page) : null;
  const bodyRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  /**
   * Arrow keys only reach the book when the keyboard focus is INSIDE the Heyzine frame (a website cannot pass
   * keys into another site's frame). So focus goes into the book as soon as it has loaded, and back into it
   * after a mouse click on our top bar.
   */
  const ignoreBlurUntil = useRef(0);
  const focusBook = () => {
    const f = frameRef.current;
    if (!f) return;
    ignoreBlurUntil.current = performance.now() + 500; // our own focus move is not the reader touching the book
    f.focus();
    try {
      f.contentWindow?.focus();
    } catch {
      /* cross-origin: f.focus() is enough */
    }
  };
  const nar = useNarration();
  const canListen = !!book && hasNarration(book.slug);
  const listening = !!book && nar.open && nar.slug === book.slug;
  const narPage = listening ? nar.index?.pages[nar.i] : undefined;
  const playing = listening && nar.playing;
  const playingRef = useRef(false);
  playingRef.current = playing;
  const loadedRef = useRef(false);
  loadedRef.current = loaded;
  // printed page → Heyzine page, for the words' pages
  const hzOf = useMemo(() => new Map((nar.index?.pages ?? []).map((p) => [p.page, p.heyzinePage])), [nar.index]);

  // ── which Heyzine page is on screen (we set it; Heyzine cannot tell us) ──
  const turnedTo = useRef<number | null>(null); // last page the voice asked for
  const shownRef = useRef(1); // the page Heyzine was last told to show
  const hideUntil = useRef(0); // the marker waits until a page turn / reload has finished
  const touched = useRef(false); // the reader used the book (pages, zoom) while paused
  const [reload, setReload] = useState<{ n: number; page: number } | null>(null);
  const frameSrc = src && reload ? `${src.split("#")[0]}#page/${reload.page}` : src;
  useEffect(() => {
    turnedTo.current = null;
    shownRef.current = state?.page && state.page > 1 ? state.page : 1;
    touched.current = false;
    setReload(null);
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  /** the voice drives the book: turn Heyzine to page hz — unless it is already on screen (a two-page spread) */
  const turnTo = useCallback(
    (hz: number) => {
      const f = frameRef.current;
      if (!f || !src || !book) return;
      turnedTo.current = hz;
      const onScreen = heyzineVisiblePages(f.offsetWidth, f.offsetHeight, shownRef.current, book.pages).includes(hz);
      if (onScreen && !touched.current) return;
      shownRef.current = hz;
      hideUntil.current = performance.now() + TURN_MS;
      f.src = `${src.split("#")[0]}#page/${hz}`; // hash change: Heyzine turns the page, no reload
    },
    [src, book],
  );
  // a new recording starts → its page (chapters without word timings turn the book this way only)
  useEffect(() => {
    if (!loaded || !narPage) return;
    if (turnedTo.current === narPage.heyzinePage) return;
    turnTo(narPage.heyzinePage);
  }, [narPage, loaded, turnTo]);

  // the reader taps into the book (our page loses focus to Heyzine's frame) → remember it
  useEffect(() => {
    const onBlur = () => {
      if (document.activeElement === frameRef.current && performance.now() > ignoreBlurUntil.current) touched.current = true;
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  // ── the words of the recording being played ──
  const [words, setWords] = useState<SpokenWord[] | null>(null);
  useEffect(() => {
    setWords(null);
    if (!book || !narPage?.words) return;
    const url = narrationAsset(book.slug, narPage.words);
    if (!url) return;
    let alive = true;
    loadWords(url).then(
      (w) => alive && setWords(w),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [book, narPage?.words]);
  const currentWord = (list: SpokenWord[] | null) => {
    if (!list) return null;
    const t = audioTime();
    let lo = 0, hi = list.length - 1, k = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (list[m].s <= t) {
        k = m;
        lo = m + 1;
      } else hi = m - 1;
    }
    if (k < 0) return null;
    const w = list[k], next = list[k + 1];
    // keep the marker through the short gap between two words; hide it in longer pauses
    return t <= w.e + 0.15 || (next && t < next.s && next.s - w.e < 0.6) ? w : null;
  };

  // ▶ after the reader used the book while paused: reload it at the spoken page, so pages and zoom match again
  const wasPlaying = useRef(false);
  useEffect(() => {
    if (playing && !wasPlaying.current && touched.current && narPage && book) {
      touched.current = false;
      const hz = hzOf.get(currentWord(words)?.p ?? -1) ?? narPage.heyzinePage;
      shownRef.current = hz;
      turnedTo.current = hz;
      setLoaded(false);
      setReload((r) => ({ n: (r?.n ?? 0) + 1, page: hz }));
    }
    wasPlaying.current = playing;
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── the marker: every screen frame while the voice plays ──
  const markRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    const hide = () => {
      mark.style.opacity = "0";
    };
    if (!playing || !words || !book) return hide();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const f = frameRef.current;
      const w = currentWord(words);
      const hz = w ? hzOf.get(w.p) : undefined;
      if (!f || !w || !hz) return hide();
      // the spoken word is on a page that is not on screen → turn to it (once), then wait for the turn
      if (turnedTo.current !== hz && !heyzineVisiblePages(f.offsetWidth, f.offsetHeight, shownRef.current, book.pages).includes(hz)) turnTo(hz);
      if (!loadedRef.current || performance.now() < hideUntil.current) return hide();
      const r = heyzinePageRect(f.offsetWidth, f.offsetHeight, hz);
      const x = f.offsetLeft + r.x + w.box[0] * r.w - 2;
      const y = f.offsetTop + r.y + w.box[1] * r.h - 2;
      mark.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      mark.style.width = `${(w.box[2] * r.w + 4).toFixed(1)}px`;
      mark.style.height = `${(w.box[3] * r.h + 4).toFixed(1)}px`;
      mark.style.opacity = "1";
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      hide();
    };
  }, [playing, words, book, hzOf, turnTo]); // eslint-disable-line react-hooks/exhaustive-deps
  // lock screen / headphone controls show the book, chapter and cover
  useEffect(() => {
    if (!book) return;
    setNarrationMeta({
      title: book.titlePa,
      artist: 'ਡਾ. ਲਖਦੇਵ ਸਿੰਘ',
      cover: book.cover,
      chapterTitle: (n) => book.chapters.find((c) => c.n === n)?.pa ?? '',
    });
  }, [book]);
  const [zoom, setZoom] = useState(savedZoom);
  const zi = ZOOMS.indexOf(zoom as (typeof ZOOMS)[number]);
  const changeZoom = (d: number) => {
    const next = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, zi + d))];
    setZoom(next);
    try {
      if (next === 1) localStorage.removeItem(ZOOM_KEY);
      else localStorage.setItem(ZOOM_KEY, String(next));
    } catch {
      /* ignore */
    }
  };
  // after a zoom change, keep the middle of the book in view
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
  }, [zoom, src]);

  // reset the spinner whenever a different book/page is opened
  useEffect(() => setLoaded(false), [src]);

  useEffect(() => {
    if (!book) return;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeBook();
        return;
      }
      // Space = play / pause while the narration bar is open (focus on our page, not inside the book)
      if (e.key === " " && hasNarration(book.slug) && document.querySelector(".nar") && !(e.target as HTMLElement).closest?.("button, select, input")) {
        e.preventDefault();
        togglePlay();
        return;
      }
      // while the voice plays the book stays on the spoken page: page keys do nothing
      if (playingRef.current && PAGE_KEYS.includes(e.key)) {
        e.preventDefault();
        return;
      }
      // a page-turn key pressed while the focus is on our top bar: hand the keyboard to the book
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
        ].includes(e.key)
      ) {
        e.preventDefault();
        focusBook();
        if (document.querySelector(".nar")) touched.current = true; // the reader is moving the book while paused
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      stopListening(); // closing the book stops the voice (the position stays saved)
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [book]);

  if (!book || !src) return null;

  return (
    <div
      className={`viewer ${listening ? "has-narration" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-title"
    >
      <div className="viewer-bar">
        <h2 id="viewer-title" className="viewer-title" lang="pa">
          {book.titlePa}
        </h2>
        <div className="viewer-actions">
          {canListen && (
            <div className="viewer-mode" role="group" aria-label={t.narration.mode}>
              <button type="button" className={listening ? "" : "is-on"} aria-pressed={!listening} aria-label={t.shelf.read} onClick={() => stopListening()}>
                <ModeLabel text={t.shelf.read} />
              </button>
              <button
                type="button"
                className={listening ? "is-on" : ""}
                aria-pressed={listening}
                aria-label={t.shelf.listen}
                onClick={() => {
                  if (!listening) startListening(book.slug, state?.page); // opens the bar paused; only ▶ starts the voice
                }}
              >
                <ModeLabel text={t.shelf.listen} />
              </button>
            </div>
          )}
          <div
            className="viewer-zoom"
            role="group"
            aria-label={`${t.textSize.group} / Text size`}
          >
            <button
              type="button"
              onClick={(e) => {
                changeZoom(-1);
                if (e.detail > 0) focusBook();
              }}
              disabled={zi <= 0}
              aria-label={t.textSize.smaller}
              title={t.textSize.smaller}
            >
              <span className="vz-a vz-a-sm" aria-hidden>
                A
              </span>
              <span aria-hidden>−</span>
            </button>
            <span className="vz-level" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={(e) => {
                changeZoom(1);
                if (e.detail > 0) focusBook();
              }}
              disabled={zi >= ZOOMS.length - 1}
              aria-label={t.textSize.larger}
              title={t.textSize.larger}
            >
              <span className="vz-a vz-a-lg" aria-hidden>
                A
              </span>
              <span aria-hidden>+</span>
            </button>
          </div>
          <a
            className="viewer-newtab"
            href={src}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="viewer-newtab-label">{t.viewer.newTab}</span>{" "}
            <span aria-hidden>↗</span>
          </a>
          <button
            ref={closeRef}
            type="button"
            className="viewer-close"
            onClick={closeBook}
            aria-label={t.viewer.close}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path
                d="M2 2 L16 16 M16 2 L2 16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={bodyRef}
        className={`viewer-body ${zoom > 1 ? "is-zoomed" : ""}`}
        style={{ ["--vz" as string]: zoom }}
      >
        {!loaded && (
          <div className="viewer-loading" role="status">
            <span className="viewer-spinner" aria-hidden />
            <span>{t.viewer.loading}</span>
          </div>
        )}
        <iframe
          key={`${src}|${reload?.n ?? 0}`}
          className={`viewer-frame ${loaded ? "is-loaded" : ""}`}
          src={frameSrc ?? src}
          title={`${book.titlePa} — ${book.titleEn}`}
          allow="autoplay; fullscreen; clipboard-write"
          allowFullScreen
          ref={frameRef}
          onLoad={() => {
            setLoaded(true);
            hideUntil.current = performance.now() + SETTLE_MS;
            // arrow keys turn the pages straight away — unless the voice is playing (the book stays still then)
            // or the reader is using the audio bar (e.g. a list is open)
            if (!playingRef.current && !document.activeElement?.closest?.(".nar")) focusBook();
          }}
        />
        {/* the word highlight: a see-through layer over the book; nothing visible unless the voice is playing */}
        <div className="word-overlay" aria-hidden>
          <div ref={markRef} className="word-mark" />
        </div>
        {/* while the voice plays, the book stays on the spoken page: a tap on it pauses (then the book is free) */}
        {playing && <div className="viewer-catcher" onClick={() => togglePlay()} aria-hidden />}
      </div>
      {listening && <NarrationBar book={book} />}
    </div>
  );
}
