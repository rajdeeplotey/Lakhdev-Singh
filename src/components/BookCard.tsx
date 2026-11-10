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

const BookOpenIcon = () => (
  <svg className="rl-ico" width="17" height="15" viewBox="0 0 17 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
    <path d="M8.5 3.2 C6.8 1.8 4.4 1.3 1.2 1.6 V12.6 C4.4 12.3 6.8 12.8 8.5 14.2 C10.2 12.8 12.6 12.3 15.8 12.6 V1.6 C12.6 1.3 10.2 1.8 8.5 3.2 Z" />
    <path d="M8.5 3.2 V14.2" />
  </svg>
);
const HeadphonesIcon = () => (
  <svg className="rl-ico" width="17" height="16" viewBox="0 0 17 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M2 10 V8.5 a6.5 6.5 0 0 1 13 0 V10" strokeLinecap="round" />
    <rect x="1.2" y="9.2" width="3.6" height="5.6" rx="1.4" fill="currentColor" stroke="none" />
    <rect x="12.2" y="9.2" width="3.6" height="5.6" rx="1.4" fill="currentColor" stroke="none" />
  </svg>
);

/** "ਪੜ੍ਹੋ / Read" → Punjabi word + the rest; on narrow phones only icon + Punjabi word show (full text stays in aria-label). */
function BtnLabel({ text }: { text: string }) {
  const i = text.indexOf(' / ');
  if (i < 0) return <span>{text}</span>;
  return (
    <>
      <span lang="pa">{text.slice(0, i)}</span>
      <span className="rl-rest" lang="en">
        {text.slice(i)}
      </span>
    </>
  );
}

export function ReadListenButtons({ book, size = 'sm' }: { book: BookEntry; size?: 'sm' | 'lg' }) {
  const t = useT();
  return (
    <div className={`rl-btns rl-btns-${size}`}>
      <button type="button" className="rl-btn rl-btn-read" onClick={() => openBook(book.slug)} aria-label={t.shelf.read}>
        <BookOpenIcon />
        <BtnLabel text={t.shelf.read} />
      </button>
      <button type="button" className="rl-btn rl-btn-listen" onClick={() => openBook(book.slug)} aria-label={t.shelf.listen}>
        <HeadphonesIcon />
        <BtnLabel text={t.shelf.listen} />
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
      </div>
      {/* outside the text column so on phones it spans the whole card width */}
      <ChapterList book={book} />
    </article>
  );
}
