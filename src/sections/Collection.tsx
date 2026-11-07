import { useBooks } from '../content/SiteContext';
import { BookCard } from '../components/BookCard';
import { Reveal } from '../components/Reveal';
import { useT } from '../i18n';

export function Collection() {
  const t = useT();
  const data = useBooks();
  if (!data) return null;
  return (
    <section className="collection" id="books" aria-labelledby="books-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">{t.books.eyebrow}</p>
          <h2 id="books-title" className="display">
            {t.books.titleA} <em>{t.books.titleB}</em>
          </h2>
          <p className="lede">{t.hero.booksAllFree(data.books.length)}</p>
        </Reveal>
        <div className="shelf">
          {data.books.map((b, i) => (
            <Reveal key={b.slug} delay={(i % 3) * 0.1}>
              <BookCard book={b} index={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
