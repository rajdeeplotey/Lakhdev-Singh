import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SiteProvider } from './content/SiteContext';
import { PageLoader } from './components/PageLoader';
import { scrollToId } from './components/HashLink';
import Home from './pages/Home';

// Reader & detail are split into their own chunks — the homepage loads fast.
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Reader = lazy(() => import('./pages/Reader'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
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
    <SiteProvider>
      <BrowserRouter>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <ScrollManager />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/books/:slug" element={<BookDetail />} />
            <Route path="/read/:slug" element={<Reader />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SiteProvider>
  );
}
