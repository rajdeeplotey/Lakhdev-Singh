import { useSite, useBooks } from '../content/SiteContext';
import { Reveal } from '../components/Reveal';
import { HashLink } from '../components/HashLink';
import { fmtTime } from '../lib/format';
import { togglePreview, usePreviewPlaying, usePreviewTime } from '../lib/chapterPreview';
import { useT } from '../i18n';

/** About the Author — portrait arch with offset outline + LS seal, bio, stats, welcome audio. */
export function About() {
  const t = useT();
  const site = useSite();
  const data = useBooks();
  const welcome = site?.about.welcomeAudio || null;
  const playing = usePreviewPlaying(welcome);
  const elapsed = usePreviewTime(welcome);
  if (!site || !data) return null;
  const { about } = site;

  const books = data.books;
  const chapters = books.reduce((n, b) => n + b.chapters.length, 0);
  const pages = books.reduce((n, b) => n + b.pages, 0);
  const hours = about.narratedHours;
  const { prefix, first, last } = site.authorParts;
  const quote = about.quote?.trim();

  return (
    <section className="author" id="about" aria-labelledby="author-title">
      <div className="author-inner">
        <Reveal className="author-visual">
          <div className="author-arch-outline" aria-hidden />
          <div className="author-arch">
            {about.photo ? (
              <picture>
                <source srcSet={about.photo} type="image/webp" />
                <img
                  src={about.photoFallback || about.photo}
                  alt={about.photoAlt ?? `Portrait of ${site.author}`}
                  loading="lazy"
                  decoding="async"
                  width={800}
                  height={1000}
                />
              </picture>
            ) : null}
          </div>
          <div className="author-seal" aria-hidden>
            <img src={site.brand.logoSmall || site.brand.logoEmblem} alt="" loading="lazy" decoding="async" />
          </div>
        </Reveal>

        <Reveal className="author-copy" delay={0.1}>
          <p className="author-label">{about.heading}</p>
          <h2 id="author-title" className="author-name">
            {prefix} {first} <em>{last}</em>
          </h2>
          <blockquote className={`author-quote ${quote ? '' : 'is-todo'}`}>
            {quote ? `“${quote}”` : '[Quote to be supplied — edit public/content/site.json → about.quote]'}
          </blockquote>
          <div className="author-bio">
            {about.paragraphs.map((p, i) => (
              <p key={i} className={p.startsWith('[') ? 'is-todo' : ''}>
                {p}
              </p>
            ))}
          </div>

          <dl className="author-stats">
            <div>
              <dt>{t.about.booksPublished}</dt>
              <dd>{books.length}</dd>
            </div>
            <div>
              <dt>{t.about.chaptersFree}</dt>
              <dd>{chapters || '—'}</dd>
            </div>
            <div>
              {/* narration hours once recorded; until then the real page count */}
              <dt>{hours ? t.about.narratedVoice : t.about.pagesLabel}</dt>
              <dd>{hours ? t.about.hrs(hours) : pages}</dd>
            </div>
          </dl>

          <div className="author-ctas">
            <button
              type="button"
              className="author-btn author-btn-play"
              onClick={() => welcome && togglePreview(welcome)}
              disabled={!welcome}
              aria-pressed={welcome ? playing : undefined}
              aria-label={welcome ? (playing ? t.about.pauseWelcome : t.about.hearWelcome) : t.about.welcomeSoon}
            >
              <span className="author-btn-dot" aria-hidden>
                {playing ? (
                  <svg width="12" height="14" viewBox="0 0 13 15">
                    <rect x="0.5" width="4" height="15" rx="0.6" fill="currentColor" />
                    <rect x="8.5" width="4" height="15" rx="0.6" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="12" height="14" viewBox="0 0 13 15">
                    <path d="M1.5 0.8 L12.5 7.5 L1.5 14.2 Z" fill="currentColor" />
                  </svg>
                )}
              </span>
              <span>{welcome ? (playing ? t.about.playing(fmtTime(elapsed)) : t.about.hearWelcome) : t.about.welcomeSoon}</span>
            </button>
            <HashLink to="/#books" className="author-btn author-btn-line">
              {t.about.readHisBooks} <span aria-hidden>→</span>
            </HashLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
