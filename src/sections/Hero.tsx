import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLibrary, useSite } from '../content/SiteContext';
import { bookOneTargets } from '../content/bookOne';
import { Logo } from '../components/Logo';
import { BotanicalSpray } from '../components/Botanical';
import { HashLink, scrollToId } from '../components/HashLink';
import { useMediaQuery } from '../lib/useMediaQuery';
import { stopPreview, togglePreview, usePreviewPlaying } from '../lib/chapterPreview';
import { MobileHero } from './MobileHero';

export function Hero() {
  const mobile = useMediaQuery('(max-width: 1023px)');
  // stop the Chapter 1 preview when leaving the homepage
  useEffect(() => stopPreview, []);
  return mobile ? <MobileHero /> : <DesktopHero />;
}

/** Desktop hero (≥1024px): name + CTAs + cover row on the left, arch with play badge on the right. */
function DesktopHero() {
  const site = useSite();
  const lib = useLibrary();
  const { readHref, previewSrc, previewStart } = bookOneTargets(lib);
  const playing = usePreviewPlaying(previewSrc);
  if (!site || !lib) return null;
  const [first, ...rest] = site.author.replace(/^Dr\.?\s*/, '').split(' ');
  const books = lib.books.slice(0, 6);
  const total = lib.books.length;

  const toggle = () => {
    if (previewSrc) togglePreview(previewSrc, previewStart);
    else scrollToId('books');
  };
  const playLabel = previewSrc ? (playing ? 'Pause chapter 1' : 'Play chapter 1') : 'Browse the library';

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
              <em className="dhero-dr">Dr.</em>
              <span>{first}</span>
            </span>
            <em className="dhero-line2">{rest.join(' ')}</em>
          </h1>
          <p className="dhero-tagline dh-in" style={{ ['--d' as string]: '.2s' }}>
            {site.hero.headline}
          </p>
          <p className="dhero-intro dh-in" style={{ ['--d' as string]: '.26s' }}>
            {site.hero.intro}
          </p>
          <div className="dhero-ctas dh-in" style={{ ['--d' as string]: '.32s' }}>
            <Link to={readHref} className="pill pill-solid">
              Start reading <span aria-hidden>→</span>
            </Link>
            <button
              type="button"
              className="pill pill-line"
              onClick={toggle}
              aria-pressed={previewSrc ? playing : undefined}
              aria-label={previewSrc ? (playing ? 'Pause chapter 1' : 'Listen free — play chapter 1') : 'Listen free — browse the library'}
            >
              {playing ? <PauseGlyph size={12} /> : <PlayGlyph size={12} />}
              {playing ? 'Pause' : 'Listen free'}
            </button>
          </div>

          <div className="dhero-shelf dh-in" style={{ ['--d' as string]: '.4s' }}>
            <div className="dhero-shelf-label">
              <span className="dhero-shelf-title">The library</span>
              <span className="dhero-shelf-sub">{total} books, all free</span>
            </div>
            <ul className="dhero-covers">
              {books.map((b, i) => (
                <li key={b.slug}>
                  <Link to={`/books/${b.slug}`} className={`dcover tone-${i % 6}`} data-title={b.title} aria-label={`${b.title} — chapters`}>
                    {b.cover ? <img src={b.cover} alt="" width={58} height={84} loading="lazy" decoding="async" /> : null}
                  </Link>
                </li>
              ))}
            </ul>
            <HashLink to="/#books" className="dhero-viewall">
              View all <span aria-hidden>→</span>
            </HashLink>
          </div>
        </div>

        <div className="dhero-visual dh-in" style={{ ['--d' as string]: '.18s' }}>
          <div className="dhero-arch" aria-hidden>
            <div className="dhero-arch-inner">
              <Logo variant="emblem" className="dhero-emblem" eager />
            </div>
          </div>
          <button type="button" className={`dhero-badge ${playing ? 'is-playing' : ''}`} onClick={toggle} aria-label={playLabel} aria-pressed={previewSrc ? playing : undefined}>
            <svg className="dhero-badge-ring" viewBox="0 0 136 136" aria-hidden>
              <defs>
                <path id="dhero-ring" d="M68,68 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0" />
              </defs>
              <text>
                <textPath href="#dhero-ring" textLength="312" lengthAdjust="spacing">
                  READ · LISTEN · RETURN ·
                </textPath>
              </text>
            </svg>
            <span className="dhero-badge-icon" aria-hidden>
              {playing ? <PauseGlyph size={26} /> : <PlayGlyph size={30} />}
            </span>
          </button>
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
function PauseGlyph({ size }: { size: number }) {
  return (
    <svg width={size * 0.86} height={size} viewBox="0 0 13 15" aria-hidden>
      <rect x="0.5" width="4" height="15" rx="0.6" fill="currentColor" />
      <rect x="8.5" width="4" height="15" rx="0.6" fill="currentColor" />
    </svg>
  );
}
