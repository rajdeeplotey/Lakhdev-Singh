import { useLibrary } from '../content/SiteContext';
import { BookCard } from '../components/BookCard';
import { Reveal } from '../components/Reveal';

export function Collection() {
  const lib = useLibrary();
  if (!lib) return null;
  return (
    <section className="collection" id="books" aria-labelledby="books-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">The Library</p>
          <h2 id="books-title" className="display">
            The Book <em>Collection</em>
          </h2>
          <p className="lede">
            {lib.books.length} {lib.books.length === 1 ? 'volume' : 'volumes'}, each available to read and to hear,
            chapter by chapter.
          </p>
        </Reveal>
        <div className="shelf">
          {lib.books.map((b, i) => (
            <Reveal key={b.slug} delay={(i % 3) * 0.1}>
              <BookCard book={b} index={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
