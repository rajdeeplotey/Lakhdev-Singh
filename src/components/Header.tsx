import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { HashLink } from './HashLink';
import { useLibrary } from '../content/SiteContext';
import { bookOneTargets } from '../content/bookOne';

const NAV = [
  { href: '/#books', label: 'The Books' },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
];
// the full-screen mobile menu keeps every section
const MOBILE_NAV = [
  { href: '/#top', label: 'Home' },
  { href: '/#books', label: 'The Books' },
  { href: '/#about', label: 'About the Author' },
  { href: '/#read-listen', label: 'Reading & Listening' },
  { href: '/#contact', label: 'Contact' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const lib = useLibrary();
  const { listenHref } = bookOneTargets(lib);
  const overHero = pathname === '/';

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

  return (
    <header className={`site-header ${solid ? 'is-solid' : ''} ${open ? 'menu-open' : ''}`}>
      <div className="container header-inner">
        <Link to="/" className="header-brand" aria-label="Dr. Lakhdev Singh — home" onClick={close}>
          <Logo variant="emblem" badge height={48} eager />
          <span className="header-wordmark">
            <span>Lakhdev Singh</span>
            <small>Writer</small>
          </span>
        </Link>

        <nav className="header-nav" aria-label="Primary">
          {NAV.map((n) => (
            <HashLink key={n.href} to={n.href}>
              {n.label}
            </HashLink>
          ))}
          <Link to={listenHref} className="header-listen">
            <HeadphonesIcon /> Listen now
          </Link>
        </nav>

        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>

      <div id="mobile-menu" className="mobile-menu" hidden={!open}>
        <nav aria-label="Mobile">
          {MOBILE_NAV.map((n, i) => (
            <HashLink key={n.href} to={n.href} onClick={close} style={{ ['--i' as string]: i }}>
              <span className="mm-num">0{i + 1}</span>
              {n.label}
            </HashLink>
          ))}
        </nav>
        <Link to={listenHref} className="btn btn-gold" onClick={close}>
          <HeadphonesIcon /> Listen now
        </Link>
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
