import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadLibrary, loadSite } from './loaders';
import type { Library, SiteContent } from './types';

interface Ctx {
  site: SiteContent | null;
  library: Library | null;
  error: string | null;
}
const SiteCtx = createContext<Ctx>({ site: null, library: null, error: null });

export function SiteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ site: null, library: null, error: null });
  useEffect(() => {
    Promise.all([loadSite(), loadLibrary()])
      .then(([site, library]) => setState({ site, library, error: null }))
      .catch((e) => setState({ site: null, library: null, error: String(e) }));
  }, []);
  return <SiteCtx.Provider value={state}>{children}</SiteCtx.Provider>;
}

export const useSite = () => useContext(SiteCtx).site;
export const useLibrary = () => useContext(SiteCtx).library;
export const useContentError = () => useContext(SiteCtx).error;
