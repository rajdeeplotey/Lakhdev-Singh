import { Link } from 'react-router-dom';
import type { Book } from '../content/types';
import { hasAudio, isReadable } from '../content/loaders';
import { BookCover } from './BookCover';
import { pad2 } from '../lib/format';

export function BookMeta({ book }: { book: Book }) {
  if (!isReadable(book)) return <span className="book-meta">Coming soon</span>;
  const n = book.chapters.length;
  return (
    <span className="book-meta">
      {n} {n === 1 ? 'chapter' : 'chapters'}
      {hasAudio(book) && <> · Narrated</>}
    </span>
  );
}

export function BookCard({ book, index }: { book: Book; index: number }) {
  const readable = isReadable(book);
  const audio = hasAudio(book);
  return (
    <article className={`book-card ${readable ? '' : 'is-pending'}`}>
      <Link
        to={`/books/${book.slug}`}
        className="book-card-cover"
        aria-label={`${book.title} — details`}
        tabIndex={-1}
      >
        <BookCover book={book} sizes="(max-width: 600px) 34vw, (max-width: 1024px) 40vw, 300px" />
      </Link>
      <div className="book-card-body">
        <span className="book-no">No. {pad2(index + 1)}</span>
        <h3 className="book-card-title" lang={book.language}>
          <Link to={`/books/${book.slug}`}>{book.title}</Link>
        </h3>
        {book.subtitle && <p className="book-card-sub">{book.subtitle}</p>}
        {book.description && <p className="book-card-desc">{book.description}</p>}
        <BookMeta book={book} />
        <div className="book-card-actions">
          {readable ? (
            <>
              <Link to={`/read/${book.slug}?mode=classic`} className="link-line">
                Read
              </Link>
              {audio && (
                <Link to={`/read/${book.slug}?mode=listen`} className="link-line">
                  Listen
                </Link>
              )}
            </>
          ) : (
            <span className="link-line is-muted" aria-disabled="true">
              Available soon
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
