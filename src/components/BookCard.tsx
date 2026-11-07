import type { BookEntry } from '../content/books';
import { visibleChapters } from '../content/books';
import { openBook } from '../lib/viewer';
import { pad2 } from '../lib/format';
import { useT } from '../i18n';

/** Punjabi title large, English transliteration small underneath (both searchable). */
export function BookTitle({ book, as: Tag = 'h3', className = '' }: { book: BookEntry; as?: 'h1' | 'h2' | 'h3'; className?: string }) {
  return (
    <Tag className={`book-title ${className}`}>
      <span className="book-title-pa" lang="pa">
        {book.titlePa}
      </span>
      <span className="book-title-en" lang="en">
        {book.titleEn}
      </span>
    </Tag>
  );
}

export function BookMeta({ book }: { book: BookEntry }) {
  const t = useT();
  return (
    <span className="book-meta">
      {t.shelf.chapters(book.chapters.length)} · {t.shelf.pages(book.pages)}
    </span>
  );
}

export function ReadListenButtons({ book, size = 'sm' }: { book: BookEntry; size?: 'sm' | 'lg' }) {
  const t = useT();
  return (
    <div className={`rl-btns rl-btns-${size}`}>
      <button type="button" className="rl-btn rl-btn-read" onClick={() => openBook(book.slug)}>
        {t.shelf.read}
      </button>
      <button type="button" className="rl-btn rl-btn-listen" onClick={() => openBook(book.slug)}>
        {t.shelf.listen}
      </button>
    </div>
  );
}

/** Chapter list (ਤਤਕਰਾ): collapsed by default; each chapter opens the flipbook at its page. */
export function ChapterList({ book }: { book: BookEntry }) {
  const t = useT();
  const chapters = visibleChapters(book);
  if (!chapters.length) return null;
  return (
    <details className="toc-details">
      <summary>
        <span>{t.shelf.toc}</span>
        <span className="toc-count">{chapters.length}</span>
      </summary>
      <ol className="toc-list">
        {chapters.map((c) => (
          <li key={c.n}>
            <a
              href={`#book-${book.slug}/page/${c.heyzinePage}`}
              onClick={(e) => {
                e.preventDefault();
                openBook(book.slug, c.heyzinePage);
              }}
              aria-label={t.shelf.openAt(c.pa)}
            >
              <span className="toc-n">{pad2(c.n)}</span>
              <span className="toc-pa" lang="pa">
                {c.pa}
              </span>
              {c.page != null && <span className="toc-pg">{c.page}</span>}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}

export function BookCard({ book, index }: { book: BookEntry; index: number }) {
  const t = useT();
  return (
    <article className="book-card" id={`b-${book.slug}`} aria-labelledby={`bt-${book.slug}`}>
      <a
        href={`#book-${book.slug}`}
        className="book-card-cover"
        onClick={(e) => {
          e.preventDefault();
          openBook(book.slug);
        }}
        aria-label={t.shelf.openBook(book.titlePa)}
      >
        <div className="cover" style={{ aspectRatio: `${book.coverWidth} / ${book.coverHeight}` }}>
          <img src={book.cover} alt={`${book.titlePa} — ${book.titleEn}`} width={book.coverWidth} height={book.coverHeight} loading="lazy" decoding="async" />
          <span className="cover-spine" aria-hidden />
        </div>
      </a>
      <div className="book-card-body">
        <span className="book-no">{t.books.no(pad2(index + 1))}</span>
        <div id={`bt-${book.slug}`}>
          <BookTitle book={book} />
        </div>
        {book.descriptionPa && (
          <p className="book-card-desc" lang="pa">
            {book.descriptionPa}
          </p>
        )}
        <BookMeta book={book} />
        <ReadListenButtons book={book} />
        <ChapterList book={book} />
      </div>
    </article>
  );
}
