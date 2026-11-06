import { Link } from 'react-router-dom';
import { useLibrary } from '../content/SiteContext';
import { hasAudio, isReadable } from '../content/loaders';
import { BookCover } from '../components/BookCover';
import { BotanicalSpray } from '../components/Botanical';
import { BookMeta } from '../components/BookCard';
import { Reveal } from '../components/Reveal';

function Marquee() {
  const items = Array.from({ length: 6 });
  const row = (
    <div className="marquee-row" aria-hidden>
      {items.map((_, i) => (
        <span key={i} className={i % 2 ? 'mq-outline' : 'mq-solid'}>
          Latest Release <em>✦</em>
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee">
      <span className="sr-only">Latest release</span>
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  );
}

export function LatestRelease() {
  const lib = useLibrary();
  if (!lib) return null;
  const book = lib.books.find((b) => b.slug === lib.latestRelease) ?? lib.books[0];
  if (!book) return null;
  const readable = isReadable(book);

  return (
    <section className="latest" id="latest" aria-labelledby="latest-title">
      <Marquee />
      <div className="container latest-grid">
        <Reveal className="latest-visual">
          <div className="latest-halo" aria-hidden />
          <BotanicalSpray className="latest-bot latest-bot-l" />
          <BotanicalSpray className="latest-bot latest-bot-r" flip />
          <BookCover book={book} className="latest-cover" eager sizes="(max-width: 768px) 64vw, 380px" />
          <div className="latest-shadow" aria-hidden />
        </Reveal>

        <Reveal className="latest-copy" delay={0.15}>
          <p className="eyebrow">New from the author</p>
          <h2 id="latest-title" className="latest-title" lang={book.language}>
            {book.title}
          </h2>
          {book.subtitle && <p className="latest-sub">{book.subtitle}</p>}
          <p className="lede latest-desc">
            {book.description ||
              (book.placeholder
                ? 'The featured book will appear here. Set "latestRelease" in public/content/library.json to the slug of the newest title.'
                : '')}
          </p>
          <BookMeta book={book} />
          <div className="latest-ctas">
            {readable ? (
              <>
                <Link to={`/read/${book.slug}?mode=classic`} className="btn">
                  Read the Book <span className="arrow">→</span>
                </Link>
                {hasAudio(book) && (
                  <Link to={`/read/${book.slug}?mode=listen`} className="btn btn-ghost">
                    <PlayGlyph /> Listen to the Book
                  </Link>
                )}
              </>
            ) : (
              <span className="btn" aria-disabled="true">
                Coming soon
              </span>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function PlayGlyph() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden>
      <path d="M0 0 L10 6 L0 12 Z" fill="currentColor" />
    </svg>
  );
}
