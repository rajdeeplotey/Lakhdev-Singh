import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSite } from '../content/SiteContext';
import { Reveal } from '../components/Reveal';
import { HashLink } from '../components/HashLink';
import { loadAuthorBio, type AuthorBio, type BioLangId, type BioSection } from '../content/authorBio';
import { useLang } from '../i18n';
import { en } from '../i18n/en';
import { pa } from '../i18n/pa';

const KEY = 'ls-writer:about-lang';
const DICT = { en, pa } as const;

/**
 * Language of this section. Default ਪੰਜਾਬੀ; the visitor's choice in the section's own switch is remembered.
 * When the visitor uses the site-wide switch in the header, this section follows it too.
 */
function useAboutLang(): [BioLangId, (l: BioLangId) => void] {
  const { lang: siteLang } = useLang();
  const [lang, setLangState] = useState<BioLangId>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'pa') return saved;
    } catch {
      /* storage blocked */
    }
    return 'pa';
  });
  const setLang = (l: BioLangId) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  };
  const prevSite = useRef(siteLang);
  useEffect(() => {
    if (prevSite.current === siteLang) return; // only an actual click on the header switch
    prevSite.current = siteLang;
    setLang(siteLang);
  }, [siteLang]);
  return [lang, setLang];
}

function AboutLangSwitch({ lang, onChange }: { lang: BioLangId; onChange: (l: BioLangId) => void }) {
  const opts: { id: BioLangId; label: string }[] = [
    { id: 'pa', label: 'ਪੰਜਾਬੀ' },
    { id: 'en', label: 'English' },
  ];
  return (
    <div className="lang-toggle author-lang" role="group" aria-label="ਭਾਸ਼ਾ / Language">
      {opts.map((o) => (
        <button key={o.id} type="button" lang={o.id} className={lang === o.id ? 'is-on' : ''} aria-pressed={lang === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BioBlock({ section }: { section: BioSection }) {
  return (
    <section className="author-block">
      <h3>{section.heading}</h3>
      {section.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {section.items.length > 0 && (
        <ul className="author-list">
          {section.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Desktop: the left column (portrait + timeline) is sticky. When it is taller than the window it sticks
 * by its bottom edge instead, so the end of the timeline can always be reached.
 */
function useStickyTop(ref: React.RefObject<HTMLElement>, deps: unknown[]) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 84;
      const want = header + 40;
      const top = Math.min(want, window.innerHeight - el.offsetHeight - 24);
      el.style.setProperty('--aside-top', `${Math.round(top)}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** About the Author — portrait arch + timeline (left), biography from author-bio.md (right), own ਪੰਜਾਬੀ/English switch. */
export function About() {
  const site = useSite();
  const [lang, setLang] = useAboutLang();
  const [bio, setBio] = useState<AuthorBio | null>(null);
  const [failed, setFailed] = useState(false);
  const asideRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    loadAuthorBio().then(
      (b) => alive && setBio(b),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);
  useStickyTop(asideRef, [bio, lang, !!site]);
  if (!site) return null;

  const { about } = site;
  const t = DICT[lang].author;
  const b = bio?.[lang];

  return (
    <section className={`author author-lang-${lang}`} id="about" aria-labelledby="author-title">
      <div className="author-inner">
        <div className="author-top">
          <AboutLangSwitch lang={lang} onChange={setLang} />
        </div>

        <div className="author-aside" ref={asideRef}>
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

          {b && b.timeline.items.length > 0 && (
            <section className="author-timeline" lang={lang} aria-labelledby="author-tl-title">
              <h3 id="author-tl-title">{b.timeline.heading}</h3>
              <ol>
                {b.timeline.items.map((it, i) => (
                  <li key={i}>
                    <span className="tl-year">{it.year}</span>
                    <span className="tl-text">{it.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <div className="author-copy" lang={lang}>
          <p className="author-label">{t.label}</p>
          <h2 id="author-title" className="author-name">
            {t.nameFirst} <em>{t.nameLast}</em>
          </h2>

          {b ? (
            <>
              {b.intro.paragraphs.map((p, i) => (
                <blockquote key={i} className="author-quote">
                  <p>{p}</p>
                </blockquote>
              ))}

              <dl className="author-stats">
                {t.stats.map((s) => (
                  <div key={s.value}>
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="author-blocks">
                {b.sections.map((s) => (
                  <BioBlock key={s.heading} section={s} />
                ))}
              </div>
            </>
          ) : (
            !failed && (
              <p className="author-loading" role="status">
                {t.loading}
              </p>
            )
          )}

          <div className="author-ctas">
            <HashLink to="/#books" className="author-btn author-btn-books">
              {t.readBooks} <span aria-hidden>→</span>
            </HashLink>
          </div>
        </div>
      </div>
    </section>
  );
}
