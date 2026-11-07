/**
 * The author's books (Heyzine flipbooks). Data lives in public/content/books.json —
 * adding a book = adding one entry there. Gurmukhi text in that file is copied from the books; never retype it.
 */
export interface Chapter {
  n: number;
  /** chapter title (Unicode Gurmukhi, NFC) */
  pa: string;
  /** page number printed in the book (null if not printed) */
  page: number | null;
  /** page in the Heyzine flipbook (#page/N) */
  heyzinePage: number;
  verify?: string;
  note?: string;
}

export interface BookEntry {
  id: number;
  slug: string;
  titlePa: string;
  titleEn: string;
  cover: string;
  coverWidth: number;
  coverHeight: number;
  heyzine: string;
  descriptionPa: string;
  pages: number;
  /** the chapter list is only shown on the site once this is true */
  chaptersConfirmed: boolean;
  chaptersSource?: string;
  chapters: Chapter[];
}

export interface BooksData {
  featured: string;
  books: BookEntry[];
}

export async function loadBooks(): Promise<BooksData> {
  const r = await fetch('/content/books.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${r.status} loading books.json`);
  return r.json();
}

/** Flipbook URL, optionally opened at a page (Heyzine deep link: #page/N). */
export const heyzineUrl = (b: BookEntry, page?: number) => (page && page > 1 ? `${b.heyzine}#page/${page}` : b.heyzine);

export const visibleChapters = (b: BookEntry) => (b.chaptersConfirmed ? b.chapters : []);
