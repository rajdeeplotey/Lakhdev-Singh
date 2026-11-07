import { useEffect, useRef, useState } from 'react';
import { useBooks } from '../content/SiteContext';
import { heyzineUrl } from '../content/books';
import { closeBook, useViewer } from '../lib/viewer';
import { useT } from '../i18n';

/**
 * Full-screen Heyzine viewer. The iframe exists only while the viewer is open (fast pages, and the
 * flipbook's sound stops the moment it closes). Close with ✕, Esc or the browser Back button.
 */
export function BookViewer() {
  const t = useT();
  const data = useBooks();
  const state = useViewer();
  const book = state && data?.books.find((b) => b.slug === state.slug);
  const [loaded, setLoaded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const src = book ? heyzineUrl(book, state?.page) : null;

  // reset the spinner whenever a different book/page is opened
  useEffect(() => setLoaded(false), [src]);

  useEffect(() => {
    if (!book) return;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeBook();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [book]);

  if (!book || !src) return null;

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-labelledby="viewer-title">
      <div className="viewer-bar">
        <h2 id="viewer-title" className="viewer-title" lang="pa">
          {book.titlePa}
        </h2>
        <div className="viewer-actions">
          <a className="viewer-newtab" href={src} target="_blank" rel="noopener noreferrer">
            <span className="viewer-newtab-label">{t.viewer.newTab}</span> <span aria-hidden>↗</span>
          </a>
          <button ref={closeRef} type="button" className="viewer-close" onClick={closeBook} aria-label={t.viewer.close}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path d="M2 2 L16 16 M16 2 L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="viewer-body">
        {!loaded && (
          <div className="viewer-loading" role="status">
            <span className="viewer-spinner" aria-hidden />
            <span>{t.viewer.loading}</span>
          </div>
        )}
        <iframe
          key={src}
          className={`viewer-frame ${loaded ? 'is-loaded' : ''}`}
          src={src}
          title={`${book.titlePa} — ${book.titleEn}`}
          allow="autoplay; fullscreen; clipboard-write"
          allowFullScreen
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
