import { useBooks } from '../content/SiteContext';
import { BotanicalSpray } from '../components/Botanical';
import { BookMeta, BookTitle, ReadListenButtons } from '../components/BookCard';
import { Reveal } from '../components/Reveal';
import { openBook } from '../lib/viewer';
import { useT } from '../i18n';

function Marquee() {
  const t = useT();
  const items = Array.from({ length: 6 });
  const row = (
    <div className="marquee-row" aria-hidden>
      {items.map((_, i) => (
        <span key={i} className={i % 2 ? 'mq-outline' : 'mq-solid'}>
          {t.latest.marquee} <em>✦</em>
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee">
      <span className="sr-only">{t.latest.marquee}</span>
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  );
}

export function LatestRelease() {
  const t = useT();
  const data = useBooks();
  if (!data?.books.length) return null;
  const book = data.books.find((b) => b.slug === data.featured) ?? data.books[data.books.length - 1];

  return (
    <section className="latest" id="latest" aria-labelledby="latest-title">
      <Marquee />
      <div className="container latest-grid">
        <Reveal className="latest-visual">
          <div className="latest-halo" aria-hidden />
          <BotanicalSpray className="latest-bot latest-bot-l" />
          <BotanicalSpray className="latest-bot latest-bot-r" flip />
          <a
            href={`#book-${book.slug}`}
            className="latest-cover-link"
            onClick={(e) => {
              e.preventDefault();
              openBook(book.slug);
            }}
            aria-label={t.shelf.openBook(book.titlePa)}
          >
            <div className="cover latest-cover" style={{ aspectRatio: `${book.coverWidth} / ${book.coverHeight}` }}>
              <img src={book.cover} alt={`${book.titlePa} — ${book.titleEn}`} width={book.coverWidth} height={book.coverHeight} decoding="async" />
              <span className="cover-spine" aria-hidden />
            </div>
          </a>
          <div className="latest-shadow" aria-hidden />
        </Reveal>

        <Reveal className="latest-copy" delay={0.15}>
          <p className="eyebrow">{t.latest.eyebrow}</p>
          <div id="latest-title">
            <BookTitle book={book} as="h2" className="latest-title" />
          </div>
          {book.descriptionPa && (
            <p className="lede latest-desc" lang="pa">
              {book.descriptionPa}
            </p>
          )}
          <BookMeta book={book} />
          <div className="latest-ctas">
            <ReadListenButtons book={book} size="lg" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
