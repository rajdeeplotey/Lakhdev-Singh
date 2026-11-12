import type { BookEntry } from '../content/books';
import { cycleRate, goToChapter, nextPage, prevPage, seekTo, skip, togglePlay, useNarration } from '../lib/narration';
import { useT } from '../i18n';

const mmss = (s: number) => {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const Icon = {
  play: (
    <svg width="22" height="24" viewBox="0 0 13 15" aria-hidden>
      <path d="M1.5 0.8 L12.5 7.5 L1.5 14.2 Z" fill="currentColor" />
    </svg>
  ),
  pause: (
    <svg width="20" height="22" viewBox="0 0 13 15" aria-hidden>
      <rect x="0.5" width="4" height="15" rx="0.6" fill="currentColor" />
      <rect x="8.5" width="4" height="15" rx="0.6" fill="currentColor" />
    </svg>
  ),
  prev: (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <rect x="2" y="3" width="2.2" height="12" rx="0.6" fill="currentColor" />
      <path d="M16 3 L6 9 L16 15 Z" fill="currentColor" />
    </svg>
  ),
  next: (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <rect x="13.8" y="3" width="2.2" height="12" rx="0.6" fill="currentColor" />
      <path d="M2 3 L12 9 L2 15 Z" fill="currentColor" />
    </svg>
  ),
};

/** Audio bar at the bottom of the book viewer: the author's narration, page by page, synced to the flipbook. */
export function NarrationBar({ book }: { book: BookEntry }) {
  const t = useT();
  const n = useNarration();
  const pg = n.index?.pages[n.i];
  const chapter = pg ? book.chapters.find((c) => c.n === pg.chapter) : undefined;
  const dur = n.duration || pg?.duration || 0;
  const chapters = n.index ? book.chapters.filter((c) => n.index!.pages.some((p) => p.chapter === c.n)) : [];

  return (
    <div className="nar" role="region" aria-label={t.narration.bar}>
      {n.error ? (
        <p className="nar-msg" role="alert">
          {t.narration.error}
        </p>
      ) : !pg ? (
        <p className="nar-msg" role="status">
          {t.narration.loading}
        </p>
      ) : (
        <>
          <div className="nar-info">
            <label className="nar-chapter">
              <span className="sr-only">{t.narration.chapter}</span>
              <select value={pg.chapter} onChange={(e) => goToChapter(Number(e.target.value))} lang="pa">
                {chapters.map((c) => (
                  <option key={c.n} value={c.n}>
                    {c.n}. {c.pa}
                  </option>
                ))}
              </select>
            </label>
            <span className="nar-page">
              {t.narration.page(pg.page)}
              {chapter ? <span className="sr-only"> · {chapter.pa}</span> : null}
            </span>
          </div>

          <div className="nar-controls">
            <button type="button" className="nar-btn" onClick={prevPage} aria-label={t.narration.prevPage} title={t.narration.prevPage}>
              {Icon.prev}
            </button>
            <button type="button" className="nar-btn nar-skip" onClick={() => skip(-10)} aria-label={t.narration.back10} title={t.narration.back10}>
              −10
            </button>
            <button type="button" className="nar-btn nar-play" onClick={togglePlay} aria-label={n.playing ? t.narration.pause : t.narration.play} aria-pressed={n.playing}>
              {n.playing ? Icon.pause : Icon.play}
            </button>
            <button type="button" className="nar-btn nar-skip" onClick={() => skip(10)} aria-label={t.narration.fwd10} title={t.narration.fwd10}>
              +10
            </button>
            <button type="button" className="nar-btn" onClick={nextPage} aria-label={t.narration.nextPage} title={t.narration.nextPage}>
              {Icon.next}
            </button>
          </div>

          <div className="nar-progress">
            <span className="nar-time">{mmss(n.time)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(1, dur)}
              step={0.5}
              value={Math.min(n.time, dur)}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label={t.narration.position}
              aria-valuetext={`${mmss(n.time)} / ${mmss(dur)}`}
              style={{ ['--p' as string]: `${dur ? (Math.min(n.time, dur) / dur) * 100 : 0}%` }}
            />
            <span className="nar-time">{mmss(dur)}</span>
          </div>

          <button type="button" className="nar-btn nar-rate" onClick={cycleRate} aria-label={`${t.narration.speed} ${n.rate}×`} title={t.narration.speed}>
            {n.rate}×
          </button>
        </>
      )}
    </div>
  );
}
