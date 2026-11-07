import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type Dict } from './en';
import { pa } from './pa';

export type Lang = 'en' | 'pa';
export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'pa', label: 'ਪੰਜਾਬੀ', short: 'ਪੰ' },
];
const DICTS: Record<Lang, Dict> = { en, pa };
const KEY = 'ls-writer:lang';

/** Saved choice → browser language (pa*) → English. */
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'pa') return saved;
  } catch {
    /* storage blocked */
  }
  const nav = (navigator.languages ?? [navigator.language]).map((l) => l.toLowerCase());
  return nav.some((l) => l.startsWith('pa')) ? 'pa' : 'en';
}

interface Ctx {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
}
const LangCtx = createContext<Ctx>({ lang: 'en', t: en, setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === 'pa' ? 'pa' : 'en';
  }, [lang]);
  const value = useMemo(() => ({ lang, t: DICTS[lang], setLang }), [lang, setLang]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
export const useT = () => useContext(LangCtx).t;

/** Deep-merge a partial translation over the base content (arrays/strings replace). */
export function localize<T>(base: T, over: unknown): T {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return (over ?? base) as T;
  if (!base || typeof base !== 'object' || Array.isArray(base)) return over as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = localize((base as Record<string, unknown>)[k], v);
  }
  return out as T;
}
