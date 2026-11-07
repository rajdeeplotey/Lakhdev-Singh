import type { BookEntry, BooksData } from './books';

/** "Book 1" for the hero/header actions: the book with id 1, else the first in the list. */
export const startBook = (data: BooksData | null): BookEntry | undefined =>
  data ? data.books.find((b) => b.id === 1) ?? data.books[0] : undefined;

/** Flipbook page where Chapter 1 starts (falls back to the first page). */
export const firstChapterPage = (b: BookEntry) => b.chapters[0]?.heyzinePage ?? 1;
