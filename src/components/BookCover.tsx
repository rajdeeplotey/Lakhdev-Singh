import { useState } from 'react';
import type { Book } from '../content/types';

/**
 * Real cover when supplied; otherwise a restrained typographic placeholder that
 * keeps the 2:3 proportion so layouts never shift when real covers arrive.
 */
export function BookCover({
  book,
  className = '',
  eager = false,
  sizes = '(max-width: 768px) 60vw, 320px',
}: {
  book: Book;
  className?: string;
  eager?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const w = book.coverWidth ?? 800;
  const h = book.coverHeight ?? 1200;

  return (
    <div className={`cover ${className}`} style={{ aspectRatio: `${w} / ${h}` }}>
      {book.cover && !failed ? (
        <img
          src={book.cover}
          alt={`Cover of ${book.title}`}
          width={w}
          height={h}
          sizes={sizes}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cover-ph" aria-label={`${book.title} — cover to be supplied`} role="img">
          <span className="cover-ph-frame" />
          <span className="cover-ph-orn">✦</span>
          <span className="cover-ph-title">{book.title}</span>
          {book.subtitle && <span className="cover-ph-sub">{book.subtitle}</span>}
          <span className="cover-ph-author">Lakhdev Singh</span>
        </div>
      )}
      <span className="cover-spine" aria-hidden />
    </div>
  );
}
