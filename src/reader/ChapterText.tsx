import { memo, useLayoutEffect, type RefObject } from 'react';
import type { ChapterText as ChapterTextT } from '../content/types';

/**
 * Semantic, responsive text: every sentence is a <span data-sid>, optionally split into
 * word spans (data-w) when real word timings exist. Pagination and highlighting both work
 * on these elements, so they stay correct at any screen or font size.
 */
export const ChapterText = memo(function ChapterText({
  text,
  wordSentences,
  showTitle = true,
  chapterLabel,
}: {
  text: ChapterTextT;
  wordSentences: Set<string>;
  showTitle?: boolean;
  chapterLabel?: string;
}) {
  return (
    <>
      {showTitle && (
        <header className="ch-head">
          {chapterLabel && <span className="ch-label">{chapterLabel}</span>}
          <h2 className="ch-title">{text.title}</h2>
          <span className="ch-orn" aria-hidden>
            ✦
          </span>
        </header>
      )}
      {text.paragraphs.map((p, pi) => {
        if (p.kind === 'break')
          return (
            <p key={p.id} className="ch-break" aria-hidden>
              ⁂
            </p>
          );
        const Tag = p.kind === 'h' ? 'h3' : p.kind === 'quote' ? 'blockquote' : 'p';
        return (
          <Tag key={p.id} className={`ch-${p.kind ?? 'p'} ${pi === 0 ? 'ch-first' : ''}`}>
            {p.sentences.map((s, si) => (
              <span key={s.id}>
                <span className="s" data-sid={s.id}>
                  {wordSentences.has(s.id)
                    ? s.text.split(/(\s+)/).map((tok, ti) =>
                        /^\s+$/.test(tok) || tok === '' ? (
                          tok
                        ) : (
                          <span key={ti} className="w" data-w={ti / 2}>
                            {tok}
                          </span>
                        ),
                      )
                    : s.text}
                </span>
                {si < p.sentences.length - 1 ? ' ' : ''}
              </span>
            ))}
          </Tag>
        );
      })}
    </>
  );
});

/** Toggles highlight classes directly in the DOM — the (large) text never re-renders while narrating. */
export function useHighlight(
  root: RefObject<HTMLElement>,
  activeId: string | null,
  activeWord: number,
  version: unknown,
) {
  useLayoutEffect(() => {
    const r = root.current;
    if (!r) return;
    r.querySelectorAll('.is-active').forEach((e) => e.classList.remove('is-active'));
    r.querySelectorAll('.is-word').forEach((e) => e.classList.remove('is-word'));
    if (!activeId) return;
    // every copy (Classic mode renders the chapter once per page)
    r.querySelectorAll(`[data-sid="${cssEsc(activeId)}"]`).forEach((el) => {
      el.classList.add('is-active');
      if (activeWord >= 0) el.querySelector(`[data-w="${activeWord}"]`)?.classList.add('is-word');
    });
  }, [root, activeId, activeWord, version]);
}

export const cssEsc = (s: string) => (window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/"/g, '\\"'));
