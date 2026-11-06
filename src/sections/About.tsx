import { useSite, useLibrary } from '../content/SiteContext';
import { Reveal } from '../components/Reveal';
import { HashLink } from '../components/HashLink';
import { fmtTime } from '../lib/format';
import { togglePreview, usePreviewPlaying, usePreviewTime } from '../lib/chapterPreview';

/** About the Author — portrait arch with offset outline + LS seal, bio, stats, welcome audio. */
export function About() {
  const site = useSite();
  const lib = useLibrary();
  const welcome = site?.about.welcomeAudio || null;
  const playing = usePreviewPlaying(welcome);
  const elapsed = usePreviewTime(welcome);
  if (!site || !lib) return null;
  const { about } = site;

  const books = lib.books.filter((b) => !b.devOnly);
  const chapters = books.reduce((n, b) => n + (b.placeholder ? 0 : b.chapters.length), 0);
  const hours = about.narratedHours;
  const [first, ...rest] = site.author.split(' ');
  const last = rest.pop() ?? '';
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
            <img src="/brand/logo-emblem-gold.webp" alt="" loading="lazy" decoding="async" />
          </div>
        </Reveal>

        <Reveal className="author-copy" delay={0.1}>
          <p className="author-label">{about.heading}</p>
          <h2 id="author-title" className="author-name">
            {first} {rest.join(' ')} <em>{last}</em>
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
              <dt>Books published</dt>
              <dd>{books.length}</dd>
            </div>
            <div>
              <dt>Chapters, all free</dt>
              <dd>{chapters || '—'}</dd>
            </div>
            <div>
              <dt>Narrated in his voice</dt>
              <dd>{hours ? `${hours} hrs` : '—'}</dd>
            </div>
          </dl>

          <div className="author-ctas">
            <button
              type="button"
              className="author-btn author-btn-play"
              onClick={() => welcome && togglePreview(welcome)}
              disabled={!welcome}
              aria-pressed={welcome ? playing : undefined}
              aria-label={welcome ? (playing ? 'Pause the welcome from the author' : 'Hear a welcome from the author') : 'Welcome message coming soon'}
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
              <span>{welcome ? (playing ? `Playing · ${fmtTime(elapsed)}` : 'Hear a welcome from the author') : 'Welcome message coming soon'}</span>
            </button>
            <HashLink to="/#books" className="author-btn author-btn-line">
              Read his books <span aria-hidden>→</span>
            </HashLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
