import { useSite } from '../content/SiteContext';
import { Reveal } from '../components/Reveal';
import { HashLink } from '../components/HashLink';
import { useT } from '../i18n';

export function ReadListen() {
  const t = useT();
  const site = useSite();
  if (!site) return null;
  return (
    <section className="readlisten" id="read-listen" aria-labelledby="rl-title">
      <div className="container">
        <div className="rl-panel">
          <Reveal className="rl-copy">
            <p className="eyebrow">{t.readListen.eyebrow}</p>
            <h2 id="rl-title">{site.readListen.heading}</h2>
            <p className="rl-body">{site.readListen.body}</p>
            <ul className="rl-points">
              {t.readListen.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
            <HashLink to="/#books" className="btn btn-gold">
              {t.readListen.openLibrary} <span className="arrow">→</span>
            </HashLink>
          </Reveal>

          <div className="rl-modes">
            <Reveal className="rl-mode" delay={0.1}>
              <svg viewBox="0 0 120 80" className="rl-icon" aria-hidden>
                <path d="M60 14 C 46 6, 22 6, 8 12 V 72 C 22 66, 46 66, 60 74 Z" />
                <path d="M60 14 C 74 6, 98 6, 112 12 V 72 C 98 66, 74 66, 60 74 Z" />
                <path d="M18 26 H 50 M18 34 H 50 M18 42 H 46 M70 26 H 102 M70 34 H 102 M70 42 H 96" opacity=".55" />
              </svg>
              <span className="rl-mode-no">{t.readListen.mode1}</span>
              <h3>{t.readListen.mode1Title}</h3>
              <p>{t.readListen.mode1Text}</p>
            </Reveal>
            <Reveal className="rl-mode" delay={0.2}>
              <svg viewBox="0 0 120 80" className="rl-icon" aria-hidden>
                <path d="M10 40 h6 M22 30 v20 M30 22 v36 M38 32 v16 M46 18 v44 M54 28 v24 M62 14 v52 M70 26 v28 M78 34 v12 M86 22 v36 M94 30 v20 M102 36 v8 M110 40 h0" />
              </svg>
              <span className="rl-mode-no">{t.readListen.mode2}</span>
              <h3>{t.readListen.mode2Title}</h3>
              <p>{t.readListen.mode2Text}</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
