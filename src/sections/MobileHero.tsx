import { useState } from 'react';
import { useBooks, useSite } from '../content/SiteContext';
import { Logo } from '../components/Logo';
import { openBook } from '../lib/viewer';
import { firstChapterPage, startBook } from '../content/startBook';
import { useLang, useT } from '../i18n';

/**
 * Mobile/tablet hero (<1024px): one screen — arch + badge, name, two CTAs, trust line, swipeable shelf.
 * Every book action opens the Heyzine viewer.
 */
export function MobileHero() {
  const t = useT();
  const { lang } = useLang();
  const site = useSite();
  const data = useBooks();
  const [selected, setSelected] = useState<string | null>(null);

  if (!site || !data) return null;
  const books = data.books;
  const book1 = startBook(data);
  const { prefix, first, last } = site.authorParts;
  const n = books.length;

  const openCover = (slug: string) => {
    setSelected(slug);
    window.setTimeout(() => openBook(slug), 180);
  };

  return (
    <section className="mhero" id="top" aria-labelledby="mhero-name">
      <div className="mhero-main">
        <div className="mhero-visual">
          <div className="mhero-arch" aria-hidden>
            <div className="mhero-arch-inner">
              <Logo variant="emblem" className="mhero-emblem" eager />
            </div>
          </div>
          {book1 && (
            <button className="mhero-badge" onClick={() => openBook(book1.slug)} aria-label={t.shelf.openBook(book1.titlePa)}>
              <svg className="mhero-badge-ring" viewBox="0 0 78 78" aria-hidden>
                <defs>
                  <path id="mhero-ring" d="M39,39 m-29,0 a29,29 0 1,1 58,0 a29,29 0 1,1 -58,0" />
                </defs>
                <text>
                  <textPath href="#mhero-ring" textLength={lang === 'pa' ? undefined : 180} lengthAdjust={lang === 'pa' ? undefined : 'spacing'}>
                    {t.hero.ring}
                  </textPath>
                </text>
              </svg>
              <span className="mhero-badge-icon" aria-hidden>
                <svg width="13" height="15" viewBox="0 0 13 15">
                  <path d="M1 0.8 L12.5 7.5 L1 14.2 Z" fill="currentColor" />
                </svg>
              </span>
            </button>
          )}
        </div>

        <p className="mhero-label">{site.hero.eyebrow}</p>
        <h1 id="mhero-name" className="mhero-name">
          <span>
            {prefix} {first}
          </span>
          <em>{last}</em>
        </h1>
        <p className="mhero-tagline">{site.hero.headline.replace(/,\s+/, ',\n')}</p>

        {book1 && (
          <div className="mhero-ctas">
            <button type="button" className="mhero-btn mhero-btn-solid" onClick={() => openBook(book1.slug, firstChapterPage(book1))}>
              {t.hero.startReading}
            </button>
            <button type="button" className="mhero-btn mhero-btn-line" onClick={() => openBook(book1.slug)}>
              <HeadphonesIcon /> {t.hero.listen}
            </button>
          </div>
        )}
        <p className="mhero-trust">{t.hero.trust(n)}</p>
      </div>

      <div className="mhero-shelf">
        <div className="mhero-shelf-head">
          <h2>{t.hero.library}</h2>
          <span>{t.hero.booksSwipe(n)}</span>
        </div>
        <ul className="mhero-row" aria-label={t.nav.books}>
          {books.map((b, i) => (
            <li key={b.slug}>
              <a
                href={`#book-${b.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  openCover(b.slug);
                }}
                className={`mcover tone-${i % 6} ${selected === b.slug ? 'is-selected' : ''}`}
                aria-label={t.shelf.openBook(b.titlePa)}
              >
                <img src={b.cover} alt="" width={72} height={102} loading="lazy" decoding="async" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HeadphonesIcon() {
  return (
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 10 V8.5 a6.5 6.5 0 0 1 13 0 V10" strokeLinecap="round" />
      <rect x="1.2" y="9.2" width="3.6" height="5.6" rx="1.4" fill="currentColor" stroke="none" />
      <rect x="12.2" y="9.2" width="3.6" height="5.6" rx="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
