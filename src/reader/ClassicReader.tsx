import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { useReader } from './ReaderContext';
import { ChapterText, cssEsc, useHighlight } from './ChapterText';
import { pad2 } from '../lib/format';
import { readRaw, writeStore } from '../lib/storage';
import { createPageFlip, type PageFlip } from './page-flip.js';
import './page-flip.css';

const HINT_KEY = 'hint:page-turn';
const COL_GAP = 64; // gap between the (off-screen) columns of the chapter flow

interface Dims {
  tw: number; // text width of one page
  th: number; // text height of one page
  perView: 1 | 2;
}
interface SentPos {
  id: string;
  first: number;
  last: number;
}

const wantSpread = () => window.innerWidth >= 1024 && window.innerHeight >= 560;

/**
 * Classic Book Mode.
 * Two real page elements (.page-left / .page-right). Each holds a copy of the chapter laid out in
 * CSS columns (one column = one page) and shows its own column — the text is never moved while
 * dragging. page-flip.js draws the turning leaf in a temporary layer and calls goTo() at the end.
 */
export function ClassicReader() {
  const r = useReader();
  const { text, chapterIndex, book, prefs } = r;
  const bookRef = useRef<HTMLDivElement>(null);
  const leftPageRef = useRef<HTMLDivElement>(null);
  const leftFlowRef = useRef<HTMLDivElement>(null);
  const leftViewportRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const autoTurn = useRef(false);
  const [dims, setDims] = useState<Dims | null>(null);
  const [spread, setSpread] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [layoutV, setLayoutV] = useState(0);
  const [fontsV, setFontsV] = useState(0);
  const index = useRef<SentPos[]>([]);
  const spreadRef = useRef(0);
  spreadRef.current = spread;

  const perView: 1 | 2 = dims?.perView ?? (wantSpread() ? 2 : 1);
  const stride = dims ? dims.tw + COL_GAP : 1;
  const spreadCount = Math.max(1, perView === 2 ? Math.ceil(pageCount / 2) : pageCount);
  const lastChapter = chapterIndex >= book.chapters.length - 1;
  const nextTitle = lastChapter ? null : book.chapters[chapterIndex + 1].title;

  useHighlight(bookRef, r.activeId, r.activeWord, `${layoutV}:${spread}`);

  // ── measure one page's text box ──
  useLayoutEffect(() => {
    const vp = leftViewportRef.current;
    if (!vp) return;
    const measure = () => {
      const tw = Math.floor(vp.clientWidth);
      const th = Math.floor(vp.clientHeight);
      const pv: 1 | 2 = wantSpread() ? 2 : 1;
      setDims((d) => (d && d.tw === tw && d.th === th && d.perView === pv ? d : { tw, th, perView: pv }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [!!text]);

  // re-paginate whenever a web font finishes loading (the reading font can arrive after first paint)
  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) return;
    const bump = () => setFontsV((v) => v + 1);
    fonts.ready.then(bump);
    fonts.addEventListener?.('loadingdone', bump);
    return () => fonts.removeEventListener?.('loadingdone', bump);
  }, []);

  // ── paginate + index sentence positions (measured on the left page's copy) ──
  useLayoutEffect(() => {
    const flow = leftFlowRef.current;
    if (!flow || !dims || !text) return;
    const st = dims.tw + COL_GAP;
    const count = Math.max(1, Math.round((flow.scrollWidth + COL_GAP) / st));
    const fr = flow.getBoundingClientRect();
    const colOf = (x: number) => Math.max(0, Math.floor((x - fr.left + 2) / st));
    const idx: SentPos[] = [];
    flow.querySelectorAll<HTMLElement>('[data-sid]').forEach((el) => {
      const rects = el.getClientRects();
      if (!rects.length) return;
      idx.push({ id: el.dataset.sid!, first: colOf(rects[0].left), last: colOf(rects[rects.length - 1].left) });
    });
    index.current = idx;
    setPageCount(count);

    const nSpreads = dims.perView === 2 ? Math.ceil(count / 2) : count;
    const toSpread = (col: number) => Math.max(0, Math.min(nSpreads - 1, Math.floor(col / dims.perView)));
    const t = r.consumeTarget();
    let col = 0;
    if (t?.atEnd) col = count - 1;
    else if (t?.sentenceId) col = idx.find((s) => s.id === t.sentenceId)?.first ?? 0;
    else if (r.narration.playing && r.activeId) col = idx.find((s) => s.id === r.activeId)?.first ?? 0;
    else if (r.anchorId) col = idx.find((s) => s.id === r.anchorId)?.first ?? spreadRef.current * dims.perView;
    setSpread(toSpread(col));
    setLayoutV((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, dims, prefs.fontScale, fontsV]);

  // ── report reading anchor + chapter fraction ──
  useEffect(() => {
    if (!dims || !index.current.length) return;
    const firstCol = spread * perView;
    const first = index.current.find((s) => s.last >= firstCol);
    if (first) r.setAnchorId(first.id);
    r.setChapterFraction(Math.min(1, (firstCol + perView) / pageCount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread, layoutV]);

  // ── switch the real reader to spread i (called by page-flip.js at the end of a turn) ──
  const goTo = useCallback(
    (i: number) => {
      const manual = !autoTurn.current;
      autoTurn.current = false;
      // manual turn while narrating: keep playing, stop following (shows "Back to narration")
      if (manual && r.narration.playing) r.setFollow(false);
      flushSync(() => setSpread(i));
    },
    [r],
  );

  // ── build NEW page elements for spread i (for the flip layer) ──
  const live = useRef({ spreadCount, pageCount, perView, stride, goTo, r, chapterIndex, nextTitle, bookTitle: book.title, chTitle: text?.title ?? '' });
  live.current = { spreadCount, pageCount, perView, stride, goTo, r, chapterIndex, nextTitle, bookTitle: book.title, chTitle: text?.title ?? '' };

  const getSpread = useCallback((i: number) => {
    const L = live.current;
    const tpl = leftPageRef.current;
    if (!tpl) return { left: null, right: null };
    const make = (col: number, side: 'left' | 'right'): HTMLElement | null => {
      if (col >= L.pageCount) {
        // odd last page in a spread → end-of-chapter page on the right
        return L.perView === 2 && side === 'right' && col === L.pageCount ? endPageElement(L.chapterIndex, L.nextTitle) : null;
      }
      const c = tpl.cloneNode(true) as HTMLElement;
      c.classList.toggle('page-left', side === 'left');
      c.classList.toggle('page-right', side === 'right');
      const flow = c.querySelector<HTMLElement>('.page-flow');
      if (flow) flow.style.transform = `translate3d(${-col * L.stride}px,0,0)`;
      const run = c.querySelector('.page-running');
      if (run) run.textContent = side === 'right' && L.perView === 2 ? L.chTitle : L.bookTitle;
      const folio = c.querySelector('.page-folio');
      if (folio) folio.textContent = String(col + 1);
      return c;
    };
    return L.perView === 2 ? { left: make(i * 2, 'left'), right: make(i * 2 + 1, 'right') } : { left: make(i, 'left'), right: make(i, 'right') };
  }, []);

  // ── page-flip.js ──
  useEffect(() => {
    const el = bookRef.current;
    if (!el) return;
    const flip = createPageFlip({
      book: el,
      leftPage: '.page-left',
      rightPage: '.page-right',
      getIndex: () => spreadRef.current,
      getCount: () => live.current.spreadCount,
      getSpread,
      goTo: (i) => live.current.goTo(i),
      onTogglePlay: () => {
        live.current.r.setFollow(true);
        live.current.r.narration.toggle();
      },
    });
    flipRef.current = flip;
    return () => {
      flip.destroy();
      flipRef.current = null;
    };
  }, [!!text, getSpread]);

  // ‹ › buttons: animated turn inside the chapter, chapter change at its edges
  const next = () => {
    if (spreadRef.current < spreadCount - 1) flipRef.current?.next();
    else if (!lastChapter) r.goToChapter(chapterIndex + 1);
  };
  const prev = () => {
    if (spreadRef.current > 0) flipRef.current?.prev();
    else if (chapterIndex > 0) r.goToChapter(chapterIndex - 1, { atEnd: true });
  };

  // Home / End jump within the chapter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || r.panel) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, select, textarea, [contenteditable="true"], [role="dialog"]')) return;
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        goTo(e.key === 'Home' ? 0 : spreadCount - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, spreadCount, r.panel]);

  // ── follow narration: animated turn to the next/previous spread, jump if further ──
  useEffect(() => {
    if (!r.follow || !r.activeId || !dims || !leftFlowRef.current) return;
    let col: number | undefined;
    if (r.activeWord >= 0) {
      const w = leftFlowRef.current.querySelector(`[data-sid="${cssEsc(r.activeId)}"] [data-w="${r.activeWord}"]`);
      if (w) {
        const fr = leftFlowRef.current.getBoundingClientRect();
        col = Math.floor((w.getBoundingClientRect().left - fr.left + 2) / stride);
      }
    }
    if (col == null) col = index.current.find((s) => s.id === r.activeId)?.first;
    if (col == null) return;
    const target = Math.max(0, Math.min(spreadCount - 1, Math.floor(col / perView)));
    const cur = spreadRef.current;
    if (target === cur || flipRef.current?.isTurning()) return;
    autoTurn.current = true;
    const ok = target === cur + 1 ? flipRef.current?.next() : target === cur - 1 ? flipRef.current?.prev() : false;
    if (!ok) goTo(target); // far jump (or flip unavailable): switch directly, still automatic
    // Runs when the narrated sentence/word or the layout changes — NOT when the reader turns pages
    // themselves (spread is read from a ref), so browsing never snaps back to a paused narration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.activeId, r.activeWord, r.follow, dims, layoutV]);

  // ── first-visit hint ──
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    if (!text || readRaw<boolean>(HINT_KEY)) return;
    writeStore(HINT_KEY, true);
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    setHint(touch ? 'Tip: swipe the page to turn' : 'Tip: drag the page or use ← → keys to turn');
    const id = window.setTimeout(() => setHint(null), 4000);
    return () => window.clearTimeout(id);
  }, [!!text]);

  if (!text) return <div className="reader-loading">Opening chapter…</div>;

  const leftCol = spread * perView;
  const rightCol = leftCol + 1;
  const flowStyle = (col: number): CSSProperties | undefined =>
    dims
      ? {
          width: dims.tw,
          height: dims.th,
          columnCount: 1,
          columnGap: COL_GAP,
          transform: `translate3d(${-col * stride}px,0,0)`,
        }
      : undefined;

  const chapterText = <ChapterText text={text} wordSentences={r.wordSentences} chapterLabel={`Chapter ${pad2(chapterIndex + 1)}`} />;

  return (
    <div className={`classic ${perView === 2 ? 'is-spread' : 'is-single'}`}>
      <button className="pager pager-prev" onClick={prev} onMouseDown={(e) => e.preventDefault()} aria-label="Previous page" data-no-drag>
        <Chevron dir="left" />
      </button>

      <div className="book" ref={bookRef} aria-label="Book pages">
        <div className={`book-page page-left ${perView === 1 ? 'page-right' : ''}`} ref={leftPageRef}>
          <div className="page-running" lang={book.language}>
            {book.title}
          </div>
          <div className="page-viewport" ref={leftViewportRef}>
            <div ref={leftFlowRef} className="page-flow reading-text" style={flowStyle(leftCol)} lang={book.language}>
              {chapterText}
            </div>
          </div>
          <div className="page-folio">{leftCol + 1}</div>
        </div>

        {perView === 2 &&
          (rightCol < pageCount ? (
            <div className="book-page page-right">
              <div className="page-running" lang={book.language}>
                {text.title}
              </div>
              <div className="page-viewport">
                <div className="page-flow reading-text" style={flowStyle(rightCol)} lang={book.language} aria-hidden>
                  {chapterText}
                </div>
              </div>
              <div className="page-folio">{rightCol + 1}</div>
            </div>
          ) : (
            <EndPage chapterIndex={chapterIndex} nextTitle={nextTitle} onNext={() => r.goToChapter(chapterIndex + 1)} />
          ))}
      </div>

      <button className="pager pager-next" onClick={next} onMouseDown={(e) => e.preventDefault()} aria-label="Next page" data-no-drag>
        <Chevron dir="right" />
      </button>

      <p className="sr-only" aria-live="polite">
        Page {leftCol + 1} of {pageCount}
      </p>
      {hint && (
        <p className="ptc-hint" role="status">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Right-hand page shown when a chapter ends on a left page. */
function EndPage({ chapterIndex, nextTitle, onNext }: { chapterIndex: number; nextTitle: string | null; onNext: () => void }) {
  return (
    <div className="book-page page-right page-end">
      <div className="page-end-inner">
        <span className="page-end-orn" aria-hidden>
          ✦
        </span>
        <p className="page-end-label">End of Chapter {chapterIndex + 1}</p>
        {nextTitle ? (
          <>
            <p className="page-end-next-label">Next</p>
            <p className="page-end-title">{nextTitle}</p>
            <button className="page-end-btn" onClick={onNext}>
              Next chapter →
            </button>
          </>
        ) : (
          <p className="page-end-title">The End</p>
        )}
      </div>
    </div>
  );
}

/** Same markup as <EndPage/>, built as plain DOM for the flip layer. */
function endPageElement(chapterIndex: number, nextTitle: string | null) {
  const el = document.createElement('div');
  el.className = 'book-page page-right page-end';
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  el.innerHTML =
    `<div class="page-end-inner"><span class="page-end-orn">✦</span><p class="page-end-label">End of Chapter ${chapterIndex + 1}</p>` +
    (nextTitle
      ? `<p class="page-end-next-label">Next</p><p class="page-end-title">${esc(nextTitle)}</p><span class="page-end-btn">Next chapter →</span>`
      : `<p class="page-end-title">The End</p>`) +
    `</div>`;
  return el;
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="14" height="26" viewBox="0 0 14 26" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <path d={dir === 'left' ? 'M13 1 L1 13 L13 25' : 'M1 1 L13 13 L1 25'} />
    </svg>
  );
}

export function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}
