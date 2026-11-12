import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { HashLink } from './HashLink';
import { LangToggle } from './LangToggle';
import { useBooks, useSite } from '../content/SiteContext';
import { startBook } from '../content/startBook';
import { listenToBook } from '../lib/narration';
import { useT } from '../i18n';

export function Header() {
  const t = useT();
  const site = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const book1 = startBook(useBooks());
  const overHero = pathname === '/';

  const NAV = [
    { href: '/#books', label: t.nav.books },
    { href: '/#about', label: t.nav.about },
    { href: '/#contact', label: t.nav.contact },
  ];
  // the full-screen mobile menu keeps every section
  const MOBILE_NAV = [
    { href: '/#top', label: t.nav.home },
    { href: '/#books', label: t.nav.books },
    { href: '/#about', label: t.nav.aboutLong },
    { href: '/#read-listen', label: t.nav.readListen },
    { href: '/#contact', label: t.nav.contact },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const solid = scrolled || !overHero;
  const close = () => setOpen(false);
  // Logo: on the homepage it scrolls back to the very top (and clears any #section from the address bar)
  const goTop = (e: MouseEvent) => {
    close();
    if (pathname !== '/') return; // other pages: normal link to the homepage
    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (window.location.hash) history.replaceState(history.state, '', '/');
  };
  const name = site ? `${site.authorParts.first} ${site.authorParts.last}` : 'Lakhdev Singh';

  return (
    <header className={`site-header ${solid ? 'is-solid' : ''} ${open ? 'menu-open' : ''}`}>
      <div className="container header-inner">
        <Link to="/" className="header-brand" aria-label={`${site?.author ?? 'Dr. Lakhdev Singh'} — ${t.nav.homeLink}`} onClick={goTop}>
          <Logo variant="emblem" badge height={48} eager />
          <span className="header-wordmark">
            <span>{name}</span>
            <small>{t.writer}</small>
          </span>
        </Link>

        <nav className="header-nav" aria-label={t.nav.mainMenu}>
          {NAV.map((n) => (
            <HashLink key={n.href} to={n.href}>
              {n.label}
            </HashLink>
          ))}
          <LangToggle className="header-lang" />
          {book1 && (
            <button type="button" className="header-listen" onClick={() => listenToBook(book1.slug)}>
              <HeadphonesIcon /> {t.nav.listenNow}
            </button>
          )}
        </nav>

        {/* phones & tablets: language switch stays visible in the header, not hidden in the menu */}
        <LangToggle className="header-lang-mobile" compact />

        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>

      <div id="mobile-menu" className="mobile-menu" hidden={!open}>
        <nav aria-label={t.nav.mobileMenu}>
          {MOBILE_NAV.map((n, i) => (
            <HashLink key={n.href} to={n.href} onClick={close} style={{ ['--i' as string]: i }}>
              <span className="mm-num">0{i + 1}</span>
              {n.label}
            </HashLink>
          ))}
        </nav>
        {book1 && (
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => {
              close();
              listenToBook(book1.slug);
            }}
          >
            <HeadphonesIcon /> {t.nav.listenNow}
          </button>
        )}
      </div>
    </header>
  );
}

export function HeadphonesIcon() {
  return (
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 10 V8.5 a6.5 6.5 0 0 1 13 0 V10" strokeLinecap="round" />
      <rect x="1.2" y="9.2" width="3.6" height="5.6" rx="1.4" fill="currentColor" stroke="none" />
      <rect x="12.2" y="9.2" width="3.6" height="5.6" rx="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
