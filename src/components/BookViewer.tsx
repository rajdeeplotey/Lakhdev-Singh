import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBooks } from "../content/SiteContext";
import { heyzineUrl } from "../content/books";
import { closeBook, useViewer } from "../lib/viewer";
import { useT } from "../i18n";
import { NarrationBar } from "./NarrationBar";
import { hasNarration, setNarrationMeta, startListening, stopListening, togglePlay, useNarration } from "../lib/narration";

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
  const focusBook = () => {
    const f = frameRef.current;
    if (!f) return;
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
  // the voice drives the book: when a new page starts, turn the flipbook to it (hash change, no reload)
  const turnedTo = useRef<number | null>(null);
  useEffect(() => {
    const f = frameRef.current;
    if (!f || !loaded || !narPage || !src) return;
    if (turnedTo.current === narPage.heyzinePage) return;
    turnedTo.current = narPage.heyzinePage;
    f.src = src.split('#')[0] + '#page/' + narPage.heyzinePage;
  }, [narPage, loaded, src]);
  useEffect(() => {
    turnedTo.current = null;
  }, [src]);
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
                onClick={() => (listening ? togglePlay() : startListening(book.slug, state?.page))}
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
          key={src}
          className={`viewer-frame ${loaded ? "is-loaded" : ""}`}
          src={src}
          title={`${book.titlePa} — ${book.titleEn}`}
          allow="autoplay; fullscreen; clipboard-write"
          allowFullScreen
          ref={frameRef}
          onLoad={() => {
            setLoaded(true);
            focusBook(); // arrow keys turn the pages straight away
          }}
        />
      </div>
      {listening && <NarrationBar book={book} />}
    </div>
  );
}
