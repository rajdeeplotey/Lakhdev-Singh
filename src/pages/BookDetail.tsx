import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useContentError, useLibrary } from '../content/SiteContext';
import { hasAudio, isReadable } from '../content/loaders';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { BookCover } from '../components/BookCover';
import { BotanicalSpray } from '../components/Botanical';
import { BookMeta } from '../components/BookCard';
import { PageLoader } from '../components/PageLoader';
import { PlayGlyph } from '../sections/LatestRelease';
import { positionKey, readRaw, type ReadingPosition } from '../lib/storage';
import { pad2 } from '../lib/format';
import NotFound from './NotFound';

export default function BookDetail() {
  const { slug } = useParams();
  const lib = useLibrary();
  const err = useContentError();
  const book = lib?.books.find((b) => b.slug === slug);
  const saved = useMemo(() => (book ? readRaw<ReadingPosition>(positionKey(book.slug)) : null), [book]);

  useEffect(() => {
    if (book) document.title = `${book.title} — Dr. Lakhdev Singh`;
    window.scrollTo(0, 0);
  }, [book]);

  if (!lib) return err ? <NotFound /> : <PageLoader />;
  if (!book) return <NotFound message="This book could not be found." />;

  const readable = isReadable(book);
  const audio = hasAudio(book);
  const savedCh = saved ? book.chapters.findIndex((c) => c.id === saved.chapterId) : -1;

  return (
    <>
      <Header />
      <main id="main" className="detail">
        <section className="detail-hero">
          <div className="container detail-grid">
            <div className="detail-visual">
              <BotanicalSpray className="detail-bot" />
              <BookCover book={book} eager sizes="(max-width: 768px) 60vw, 360px" />
            </div>
            <div className="detail-copy">
              <Link to="/#books" className="detail-crumb">
                ← The Library
              </Link>
              <h1 lang={book.language}>{book.title}</h1>
              {book.subtitle && <p className="detail-sub">{book.subtitle}</p>}
              {book.description && <p className="lede detail-desc">{book.description}</p>}
              <BookMeta book={book} />
              <div className="detail-ctas">
                {readable ? (
                  <>
                    {savedCh >= 0 ? (
                      <Link to={`/read/${book.slug}?mode=${saved?.mode ?? 'classic'}&ch=${book.chapters[savedCh].id}`} className="btn btn-gold">
                        Continue · Chapter {savedCh + 1} <span className="arrow">→</span>
                      </Link>
                    ) : null}
                    <Link to={`/read/${book.slug}?mode=classic&ch=${book.chapters[0].id}`} className={`btn ${savedCh >= 0 ? 'btn-light' : 'btn-gold'}`}>
                      {savedCh >= 0 ? 'Start from the beginning' : 'Read the Book'}
                    </Link>
                    {audio && (
                      <Link to={`/read/${book.slug}?mode=listen`} className="btn btn-light">
                        <PlayGlyph /> Listen
                      </Link>
                    )}
                  </>
                ) : (
                  <span className="btn btn-light" aria-disabled="true">
                    Coming soon
                  </span>
                )}
              </div>
              {saved?.progress != null && readable && (
                <div className="detail-progress" aria-label={`${Math.round(saved.progress * 100)}% read`}>
                  <span style={{ width: `${Math.round(saved.progress * 100)}%` }} />
                  <em>{Math.round(saved.progress * 100)}% read</em>
                </div>
              )}
            </div>
          </div>
        </section>

        {readable && (
          <section className="detail-chapters container" aria-labelledby="toc-title">
            <h2 id="toc-title" className="eyebrow">
              Contents
            </h2>
            <ol className="chapter-list">
              {book.chapters.map((c, i) => (
                <li key={c.id} className={i === savedCh ? 'is-current' : ''}>
                  <span className="cl-no">{pad2(i + 1)}</span>
                  <Link to={`/read/${book.slug}?mode=classic&ch=${c.id}`} className="cl-title" lang={book.language}>
                    {c.title}
                  </Link>
                  <span className="cl-actions">
                    <Link to={`/read/${book.slug}?mode=classic&ch=${c.id}`} aria-label={`Read ${c.title}`}>
                      Read
                    </Link>
                    {c.audio && (
                      <Link to={`/read/${book.slug}?mode=listen&ch=${c.id}`} aria-label={`Listen to ${c.title}`}>
                        Listen
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
