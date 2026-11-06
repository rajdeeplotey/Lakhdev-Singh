import { useEffect, useRef, type ReactNode } from 'react';
import { useReader } from './ReaderContext';
import { pad2 } from '../lib/format';
import type { ReaderPrefs } from '../lib/storage';

function Drawer({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="drawer-wrap" onClick={onClose}>
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}

/** Chapter navigation (table of contents). */
export function ChapterNav() {
  const r = useReader();
  const close = () => r.setPanel(null);
  return (
    <Drawer title="Contents" onClose={close}>
      <p className="drawer-book" lang={r.book.language}>
        {r.book.title}
      </p>
      <ol className="toc">
        {r.book.chapters.map((c, i) => (
          <li key={c.id}>
            <button
              className={i === r.chapterIndex ? 'is-current' : ''}
              aria-current={i === r.chapterIndex ? 'true' : undefined}
              onClick={() => {
                r.goToChapter(i);
                close();
              }}
            >
              <span className="toc-no">{pad2(i + 1)}</span>
              <span className="toc-title" lang={r.book.language}>
                {c.title}
              </span>
              {c.audio && (
                <span className="toc-audio" title={c.alignment ? 'Narrated · synchronised' : 'Narrated'}>
                  {c.alignment ? '◉' : '○'}
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
      <p className="toc-legend">◉ narrated &amp; synchronised · ○ narrated</p>
    </Drawer>
  );
}

export function BookmarksPanel() {
  const r = useReader();
  const close = () => r.setPanel(null);
  return (
    <Drawer title="Bookmarks" onClose={close}>
      <button className="btn btn-sm bm-add" onClick={r.addBookmark}>
        Bookmark this place
      </button>
      {r.bookmarks.length === 0 ? (
        <p className="drawer-empty">No bookmarks yet. Press “B” while reading to add one.</p>
      ) : (
        <ul className="bm-list">
          {r.bookmarks.map((b) => (
            <li key={b.createdAt}>
              <button
                className="bm-go"
                onClick={() => {
                  const i = r.book.chapters.findIndex((c) => c.id === b.chapterId);
                  if (i >= 0) r.goToChapter(i, { sentenceId: b.sentenceId });
                  close();
                }}
              >
                <span className="bm-ch">{b.chapterTitle}</span>
                <span className="bm-ex" lang={r.book.language}>
                  “{b.excerpt}”
                </span>
              </button>
              <button className="icon-btn" aria-label="Remove bookmark" onClick={() => r.removeBookmark(b)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

const THEMES: { id: ReaderPrefs['theme']; label: string }[] = [
  { id: 'ivory', label: 'Ivory' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'night', label: 'Night' },
];

export function SettingsPanel() {
  const r = useReader();
  const { prefs, setPrefs } = r;
  const step = (d: number) => setPrefs({ fontScale: Math.round(Math.min(1.6, Math.max(0.85, prefs.fontScale + d)) * 100) / 100 });
  return (
    <Drawer title="Reading settings" onClose={() => r.setPanel(null)}>
      <div className="set-group">
        <span className="set-label">Text size</span>
        <div className="size-row">
          <button className="size-btn" onClick={() => step(-0.05)} aria-label="Smaller text">
            A
          </button>
          <input
            type="range"
            min={0.85}
            max={1.6}
            step={0.05}
            value={prefs.fontScale}
            onChange={(e) => setPrefs({ fontScale: Number(e.target.value) })}
            aria-label="Text size"
            className="scrub"
            style={{ ['--pct' as string]: `${((prefs.fontScale - 0.85) / 0.75) * 100}%` }}
          />
          <button className="size-btn size-btn-l" onClick={() => step(0.05)} aria-label="Larger text">
            A
          </button>
        </div>
      </div>
      <div className="set-group">
        <span className="set-label">Paper</span>
        <div className="theme-row" role="radiogroup" aria-label="Reading theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={prefs.theme === t.id}
              className={`theme-sw theme-${t.id} ${prefs.theme === t.id ? 'is-on' : ''}`}
              onClick={() => setPrefs({ theme: t.id })}
            >
              <span>Aa</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="set-group">
        <span className="set-label">Keyboard</span>
        <dl className="keys">
          <dt>Space</dt>
          <dd>Play / pause narration</dd>
          <dt>← →</dt>
          <dd>Turn page (Book) · skip 10 s (Listen)</dd>
          <dt>J / L</dt>
          <dd>Back / forward 10 seconds</dd>
          <dt>B</dt>
          <dd>Add bookmark</dd>
          <dt>M</dt>
          <dd>Switch reading mode</dd>
        </dl>
      </div>
    </Drawer>
  );
}
