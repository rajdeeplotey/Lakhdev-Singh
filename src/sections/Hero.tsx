import { useEffect } from 'react';
import { useBooks, useSite } from '../content/SiteContext';
import { firstChapterPage, startBook } from '../content/startBook';
import { Logo } from '../components/Logo';
import { BotanicalSpray } from '../components/Botanical';
import { HashLink } from '../components/HashLink';
import { useMediaQuery } from '../lib/useMediaQuery';
import { stopPreview } from '../lib/chapterPreview';
import { openBook } from '../lib/viewer';
import { listenToBook } from '../lib/narration';
import { MobileHero } from './MobileHero';
import { useLang, useT } from '../i18n';

export function Hero() {
  const mobile = useMediaQuery('(max-width: 1023px)');
  // stop any homepage audio (author welcome) when leaving the homepage
  useEffect(() => stopPreview, []);
  return mobile ? <MobileHero /> : <DesktopHero />;
}

/** Desktop hero (≥1024px): name + CTAs + cover row on the left, arch with badge on the right. */
function DesktopHero() {
  const t = useT();
  const { lang } = useLang();
  const site = useSite();
  const data = useBooks();
  if (!site || !data) return null;
  const { prefix, first, last } = site.authorParts;
  const books = data.books.slice(0, 6);
  const total = data.books.length;
  const book1 = startBook(data);

  return (
    <section className="dhero" id="top" aria-labelledby="hero-name">
      <div className="hero-grain" aria-hidden />
      <BotanicalSpray className="hero-botanical" />

      <div className="dhero-inner">
        <div className="dhero-copy">
          <p className="dhero-label dh-in" style={{ ['--d' as string]: '.05s' }}>
            {site.hero.eyebrow}
          </p>
          <h1 id="hero-name" className="dhero-name dh-in" style={{ ['--d' as string]: '.12s' }}>
            <span className="dhero-line1">
              <em className="dhero-dr">{prefix}</em>
              <span>{first}</span>
            </span>
            <em className="dhero-line2">{last}</em>
          </h1>
          <p className="dhero-tagline dh-in" style={{ ['--d' as string]: '.2s' }}>
            {site.hero.headline}
          </p>
          <p className="dhero-intro dh-in" style={{ ['--d' as string]: '.26s' }}>
            {site.hero.intro}
          </p>
          {book1 && (
            <div className="dhero-ctas dh-in" style={{ ['--d' as string]: '.32s' }}>
              <button type="button" className="pill pill-solid" onClick={() => openBook(book1.slug, firstChapterPage(book1))}>
                {t.hero.startReading} <span aria-hidden>→</span>
              </button>
              <button type="button" className="pill pill-line" onClick={() => listenToBook(book1.slug)}>
                <PlayGlyph size={12} />
                {t.hero.listenFree}
              </button>
            </div>
          )}

          <div className="dhero-shelf dh-in" style={{ ['--d' as string]: '.4s' }}>
            <div className="dhero-shelf-label">
              <span className="dhero-shelf-title">{t.hero.library}</span>
              <span className="dhero-shelf-sub">{t.hero.booksAllFree(total)}</span>
            </div>
            <ul className="dhero-covers">
              {books.map((b, i) => (
                <li key={b.slug}>
                  <a
                    href={`#book-${b.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      openBook(b.slug);
                    }}
                    className={`dcover tone-${i % 6}`}
                    data-title={b.titlePa}
                    aria-label={t.shelf.openBook(b.titlePa)}
                  >
                    <img src={b.cover} alt="" width={58} height={82} loading="lazy" decoding="async" />
                  </a>
                </li>
              ))}
            </ul>
            <HashLink to="/#books" className="dhero-viewall">
              {t.hero.viewAll} <span aria-hidden>→</span>
            </HashLink>
          </div>
        </div>

        <div className="dhero-visual dh-in" style={{ ['--d' as string]: '.18s' }}>
          <div className="dhero-arch" aria-hidden>
            <div className="dhero-arch-inner">
              <Logo variant="emblem" className="dhero-emblem" eager />
            </div>
          </div>
          {book1 && (
            <button type="button" className="dhero-badge" onClick={() => openBook(book1.slug)} aria-label={t.shelf.openBook(book1.titlePa)}>
              <svg className="dhero-badge-ring" viewBox="0 0 136 136" aria-hidden>
                <defs>
                  <path id="dhero-ring" d="M68,68 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0" />
                </defs>
                <text>
                  <textPath href="#dhero-ring" textLength={lang === 'pa' ? undefined : 312} lengthAdjust={lang === 'pa' ? undefined : 'spacing'}>
                    {t.hero.ring}
                  </textPath>
                </text>
              </svg>
              <span className="dhero-badge-icon" aria-hidden>
                <PlayGlyph size={30} />
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function PlayGlyph({ size }: { size: number }) {
  return (
    <svg width={size * 0.86} height={size} viewBox="0 0 13 15" aria-hidden>
      <path d="M1 0.8 L12.5 7.5 L1 14.2 Z" fill="currentColor" />
    </svg>
  );
}
