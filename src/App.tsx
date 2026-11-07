import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SiteProvider } from './content/SiteContext';
import { LangProvider, useT } from './i18n';
import { PageLoader } from './components/PageLoader';
import { scrollToId } from './components/HashLink';
import Home from './pages/Home';
import { BookViewer } from './components/BookViewer';
import { parseHash } from './lib/viewer';

const NotFound = lazy(() => import('./pages/NotFound'));

function SkipLink() {
  const t = useT();
  return (
    <a href="#main" className="skip-link">
      {t.skip}
    </a>
  );
}

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (parseHash(hash)) return; // #book-… opens the viewer, never scrolls
    if (hash) {
      const id = hash.slice(1);
      // wait for content (loaded from JSON) to render
      let tries = 0;
      const t = window.setInterval(() => {
        if (document.getElementById(id) || id === 'top' || ++tries > 30) {
          window.clearInterval(t);
          scrollToId(id);
        }
      }, 50);
      return () => window.clearInterval(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <LangProvider>
    <SiteProvider>
      <BrowserRouter>
        <SkipLink />
        <ScrollManager />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <BookViewer />
      </BrowserRouter>
    </SiteProvider>
    </LangProvider>
  );
}
