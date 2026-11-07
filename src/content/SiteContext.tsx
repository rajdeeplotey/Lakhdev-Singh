import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadSite } from './loaders';
import { loadBooks, type BooksData } from './books';
import type { SiteContent } from './types';
import { localize, useLang } from '../i18n';

interface Ctx {
  site: SiteContent | null;
  books: BooksData | null;
  error: string | null;
}
const SiteCtx = createContext<Ctx>({ site: null, books: null, error: null });

export function SiteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ site: null, books: null, error: null });
  const { lang } = useLang();
  useEffect(() => {
    Promise.all([loadSite(), loadBooks()])
      .then(([site, books]) => setState({ site, books, error: null }))
      .catch((e) => setState({ site: null, books: null, error: String(e) }));
  }, []);

  // site text in the visitor's language (falls back to English field by field); book data is language-neutral
  const value = useMemo<Ctx>(() => {
    if (lang === 'en' || !state.site) return state;
    return { ...state, site: localize(state.site, state.site.i18n?.[lang]) };
  }, [state, lang]);

  return <SiteCtx.Provider value={value}>{children}</SiteCtx.Provider>;
}

export const useSite = () => useContext(SiteCtx).site;
export const useBooks = () => useContext(SiteCtx).books;
export const useContentError = () => useContext(SiteCtx).error;
