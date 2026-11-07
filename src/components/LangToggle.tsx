import { LANGS, useLang } from '../i18n';

/**
 * English / ਪੰਜਾਬੀ switch. Each option is written in its own language so a visitor who reads
 * only Punjabi can recognise it. Large tap targets (≥44px) for older readers.
 */
export function LangToggle({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const { lang, setLang, t } = useLang();
  return (
    <div className={`lang-toggle ${compact ? 'is-compact' : ''} ${className}`} role="group" aria-label={`${t.nav.language} / Language`}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          lang={l.id}
          className={lang === l.id ? 'is-on' : ''}
          aria-pressed={lang === l.id}
          onClick={() => setLang(l.id)}
        >
          {compact && l.id === 'en' ? 'EN' : l.label}
        </button>
      ))}
    </div>
  );
}
