import { useEffect, useLayoutEffect, useRef, type MouseEvent } from 'react';
import { useReader } from './ReaderContext';
import { ChapterText, cssEsc, useHighlight } from './ChapterText';
import { pad2 } from '../lib/format';

/**
 * Immersive Listening Mode — continuous text, narrated sentence highlighted, auto-scroll that
 * yields to the reader the moment they scroll by hand.
 */
export function ImmersiveReader() {
  const r = useReader();
  const { text, chapterIndex, book } = r;
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const userScroll = useRef(0);
  const programmatic = useRef(false);

  useHighlight(textRef, r.activeId, r.activeWord, text);

  const scrollToSentence = (id: string, smooth: boolean, block: 'center' | 'start' = 'center') => {
    const sc = scrollRef.current;
    const el = textRef.current?.querySelector<HTMLElement>(`[data-sid="${cssEsc(id)}"]`);
    if (!sc || !el) return;
    const sr = sc.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const offset =
      block === 'center' ? er.top - sr.top - sc.clientHeight * 0.38 + er.height / 2 : er.top - sr.top - sc.clientHeight * 0.18;
    programmatic.current = true;
    sc.scrollTo({ top: sc.scrollTop + offset, behavior: smooth ? 'smooth' : 'auto' });
    window.setTimeout(() => (programmatic.current = false), smooth ? 700 : 50);
  };

  // initial position for this chapter / after a mode switch
  useLayoutEffect(() => {
    if (!text) return;
    const t = r.consumeTarget();
    const sc = scrollRef.current;
    if (t?.atEnd && sc) sc.scrollTop = sc.scrollHeight;
    else if (t?.sentenceId) scrollToSentence(t.sentenceId, false, 'start');
    else if (r.narration.playing && r.activeId) scrollToSentence(r.activeId, false);
    else if (r.anchorId) scrollToSentence(r.anchorId, false, 'start');
    else if (sc) sc.scrollTop = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // keep the narrated sentence in view
  useEffect(() => {
    if (!r.follow || !r.activeId) return;
    const sc = scrollRef.current;
    const el = textRef.current?.querySelector<HTMLElement>(`[data-sid="${cssEsc(r.activeId)}"]`);
    if (!sc || !el) return;
    const sr = sc.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    // only move when the sentence drifts out of the comfortable middle band
    if (er.top < sr.top + sc.clientHeight * 0.18 || er.bottom > sr.top + sc.clientHeight * 0.68) {
      scrollToSentence(r.activeId, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.activeId, r.follow]);

  // track reading anchor + progress; detect manual scrolling
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc || !text) return;
    let raf = 0;
    const onScroll = () => {
      if (!programmatic.current && Date.now() - userScroll.current < 900 && r.narration.playing && r.follow) {
        r.setFollow(false);
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const top = sc.getBoundingClientRect().top + 24;
        const els = textRef.current?.querySelectorAll<HTMLElement>('[data-sid]');
        if (els) {
          for (const el of els) {
            if (el.getBoundingClientRect().bottom > top) {
              r.setAnchorId(el.dataset.sid!);
              break;
            }
          }
        }
        const max = sc.scrollHeight - sc.clientHeight;
        r.setChapterFraction(max > 0 ? Math.min(1, sc.scrollTop / max) : 1);
      });
    };
    const markUser = () => (userScroll.current = Date.now());
    sc.addEventListener('scroll', onScroll, { passive: true });
    sc.addEventListener('wheel', markUser, { passive: true });
    sc.addEventListener('touchmove', markUser, { passive: true });
    sc.addEventListener('keydown', markUser);
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      sc.removeEventListener('scroll', onScroll);
      sc.removeEventListener('wheel', markUser);
      sc.removeEventListener('touchmove', markUser);
      sc.removeEventListener('keydown', markUser);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, r.narration.playing, r.follow]);

  const onClick = (e: MouseEvent) => {
    if (window.getSelection()?.toString()) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-sid]');
    if (el?.dataset.sid && r.canPlayFrom(el.dataset.sid)) r.playFrom(el.dataset.sid);
  };

  if (!text) return <div className="reader-loading">Opening chapter…</div>;

  const canTap = r.alignment && r.narration.hasAudio;
  const hasNext = chapterIndex < book.chapters.length - 1;

  return (
    <div className="immersive" ref={scrollRef} tabIndex={-1}>
      <div
        ref={textRef}
        className={`immersive-text reading-text ${canTap ? 'is-tappable' : ''}`}
        lang={book.language}
        onClick={onClick}
      >
        <ChapterText text={text} wordSentences={r.wordSentences} chapterLabel={`Chapter ${pad2(chapterIndex + 1)}`} />
      </div>
      <nav className="immersive-end" aria-label="Chapter navigation">
        {chapterIndex > 0 && (
          <button className="link-line" onClick={() => r.goToChapter(chapterIndex - 1)}>
            ← Previous chapter
          </button>
        )}
        {hasNext ? (
          <button className="btn btn-sm" onClick={() => r.goToChapter(chapterIndex + 1)}>
            Next chapter →
          </button>
        ) : (
          <span className="immersive-fin">— The End —</span>
        )}
      </nav>
    </div>
  );
}
