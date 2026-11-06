import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLibrary, useSite } from '../content/SiteContext';
import { bookOneTargets } from '../content/bookOne';
import { Logo } from '../components/Logo';
import { scrollToId } from '../components/HashLink';
import { togglePreview, usePreviewPlaying } from '../lib/chapterPreview';

/**
 * Mobile/tablet hero (<1024px): one screen — arch + play badge, name, two CTAs, trust line, swipeable shelf.
 */
export function MobileHero() {
  const site = useSite();
  const lib = useLibrary();
  const navigate = useNavigate();
  const { readHref, listenHref, previewSrc: ch1Audio, previewStart } = bookOneTargets(lib);
  const playing = usePreviewPlaying(ch1Audio);
  const [selected, setSelected] = useState<string | null>(null);

  if (!site || !lib) return null;
  const books = lib.books;

  const toggleBadge = () => {
    if (!ch1Audio) scrollToId('books');
    else togglePreview(ch1Audio, previewStart);
  };

  const openBook = (e: MouseEvent, slug: string) => {
    e.preventDefault();
    setSelected(slug);
    window.setTimeout(() => navigate(`/books/${slug}`), 220);
  };

  const [first, ...rest] = site.author.replace(/^Dr\.?\s*/, '').split(' ');
  const n = books.length;

  return (
    <section className="mhero" id="top" aria-labelledby="mhero-name">
      <div className="mhero-main">
        <div className="mhero-visual">
          <div className="mhero-arch" aria-hidden>
            <div className="mhero-arch-inner">
              <Logo variant="emblem" className="mhero-emblem" eager />
            </div>
          </div>
          <button
            className={`mhero-badge ${playing ? 'is-playing' : ''}`}
            onClick={toggleBadge}
            aria-label={ch1Audio ? (playing ? 'Pause Chapter 1' : 'Play Chapter 1') : 'Browse the library'}
            aria-pressed={ch1Audio ? playing : undefined}
          >
            <svg className="mhero-badge-ring" viewBox="0 0 78 78" aria-hidden>
              <defs>
                <path id="mhero-ring" d="M39,39 m-29,0 a29,29 0 1,1 58,0 a29,29 0 1,1 -58,0" />
              </defs>
              <text>
                <textPath href="#mhero-ring" textLength="180" lengthAdjust="spacing">
                  READ · LISTEN · RETURN ·
                </textPath>
              </text>
            </svg>
            <span className="mhero-badge-icon" aria-hidden>
              {playing ? (
                <svg width="13" height="15" viewBox="0 0 13 15">
                  <rect x="0.5" width="4" height="15" rx="0.5" fill="currentColor" />
                  <rect x="8.5" width="4" height="15" rx="0.5" fill="currentColor" />
                </svg>
              ) : (
                <svg width="13" height="15" viewBox="0 0 13 15">
                  <path d="M1 0.8 L12.5 7.5 L1 14.2 Z" fill="currentColor" />
                </svg>
              )}
            </span>
          </button>
        </div>

        <p className="mhero-label">{site.hero.eyebrow}</p>
        <h1 id="mhero-name" className="mhero-name">
          <span>Dr. {first}</span>
          <em>{rest.join(' ')}</em>
        </h1>
        <p className="mhero-tagline">{site.hero.headline.replace(/,\s+/, ',\n')}</p>

        <div className="mhero-ctas">
          <Link to={readHref} className="mhero-btn mhero-btn-solid">
            Start reading
          </Link>
          <Link to={listenHref} className="mhero-btn mhero-btn-line">
            <HeadphonesIcon /> Listen
          </Link>
        </div>
        <p className="mhero-trust">{n} books · every chapter free · no sign-up</p>
      </div>

      <div className="mhero-shelf">
        <div className="mhero-shelf-head">
          <h2>The library</h2>
          <span>
            {n} books · swipe →
          </span>
        </div>
        <ul className="mhero-row" aria-label="Books">
          {books.map((b, i) => (
            <li key={b.slug}>
              <a
                href={`/books/${b.slug}`}
                onClick={(e) => openBook(e, b.slug)}
                className={`mcover tone-${i % 6} ${selected === b.slug ? 'is-selected' : ''}`}
                aria-label={`${b.title} — chapters`}
              >
                {b.cover ? (
                  <img src={b.cover} alt="" width={72} height={104} loading="lazy" decoding="async" />
                ) : (
                  <span className="mcover-title" lang={b.language}>
                    {b.title}
                  </span>
                )}
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
