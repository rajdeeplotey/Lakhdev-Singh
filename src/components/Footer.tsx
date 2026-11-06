import { Link } from 'react-router-dom';
import { useLibrary, useSite } from '../content/SiteContext';
import { isReadable } from '../content/loaders';
import { Logo } from './Logo';
import { Flourish } from './Botanical';
import { HashLink } from './HashLink';

export function Footer() {
  const site = useSite();
  const lib = useLibrary();
  const c = site?.contact;
  const hasContact = !!(c?.email || c?.phone || c?.address || c?.social?.length);
  const firstBook = lib?.books.find(isReadable);

  return (
    <footer className="site-footer" id="contact">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo variant="full" className="footer-logo" />
            <Flourish className="footer-flourish" />
            <p>A free library of books to read and to hear.</p>
          </div>

          <div className="footer-col">
            <h3>Explore</h3>
            <HashLink to="/#top">Home</HashLink>
            <HashLink to="/#books">The Books</HashLink>
            <HashLink to="/#about">About the Author</HashLink>
            <HashLink to="/#read-listen">Reading &amp; Listening</HashLink>
          </div>

          <div className="footer-col">
            <h3>Library</h3>
            <HashLink to="/#books">All books</HashLink>
            <HashLink to="/#latest">Latest release</HashLink>
            {firstBook && <Link to={`/books/${firstBook.slug}`}>Start reading</Link>}
          </div>

          <div className="footer-col">
            <h3>Contact</h3>
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
              <span className="muted">Contact details coming soon.</span>
            )}
          </div>
        </div>

      </div>
      <div className="footer-bar">
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} {site?.author ?? 'Dr. Lakhdev Singh'}. All rights reserved.
          </span>
          <HashLink to="/#top" className="back-top">
            Back to top ↑
          </HashLink>
        </div>
      </div>
    </footer>
  );
}
