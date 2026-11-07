import { useBooks, useSite } from '../content/SiteContext';
import { firstChapterPage, startBook } from '../content/startBook';
import { openBook } from '../lib/viewer';
import { Logo } from './Logo';
import { Flourish } from './Botanical';
import { HashLink } from './HashLink';
import { useT } from '../i18n';

export function Footer() {
  const t = useT();
  const site = useSite();
  const firstBook = startBook(useBooks());
  const c = site?.contact;
  const hasContact = !!(c?.email || c?.phone || c?.address || c?.social?.length);

  return (
    <footer className="site-footer" id="contact">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo variant="full" className="footer-logo" />
            <Flourish className="footer-flourish" />
            <p>{t.footer.tagline}</p>
          </div>

          <div className="footer-col">
            <h3>{t.footer.explore}</h3>
            <HashLink to="/#top">{t.nav.home}</HashLink>
            <HashLink to="/#books">{t.nav.books}</HashLink>
            <HashLink to="/#about">{t.nav.aboutLong}</HashLink>
            <HashLink to="/#read-listen">{t.nav.readListen}</HashLink>
          </div>

          <div className="footer-col">
            <h3>{t.footer.library}</h3>
            <HashLink to="/#books">{t.footer.allBooks}</HashLink>
            <HashLink to="/#latest">{t.footer.latest}</HashLink>
            {firstBook && (
              <a
                href={`#book-${firstBook.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  openBook(firstBook.slug, firstChapterPage(firstBook));
                }}
              >
                {t.footer.startReading}
              </a>
            )}
          </div>

          <div className="footer-col">
            <h3>{t.footer.contact}</h3>
            {hasContact ? (
              <>
                {c?.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                {c?.phone && <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>}
                {c?.address && <span>{c.address}</span>}
                {c?.social?.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                ))}
              </>
            ) : (
              <span className="muted">{t.footer.contactSoon}</span>
            )}
          </div>
        </div>

      </div>
      <div className="footer-bar">
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} {site?.author ?? 'Dr. Lakhdev Singh'}. {t.footer.rights}
          </span>
          <HashLink to="/#top" className="back-top">
            {t.footer.backTop}
          </HashLink>
        </div>
      </div>
    </footer>
  );
}
