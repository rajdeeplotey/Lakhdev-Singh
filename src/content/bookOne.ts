import { audioUrl, isReadable } from './loaders';
import type { Book, Library } from './types';

/**
 * Targets for the homepage "Start reading" / "Listen" actions.
 * "Book 1" = the first book in library.json; until it has content, the first readable book is used,
 * and if nothing is readable yet the actions open Book 1's page (which shows "Coming soon").
 */
export function bookOneTargets(lib: Library | null) {
  const books = lib?.books ?? [];
  const book1 = books[0];
  const readBook: Book | undefined = book1 && isReadable(book1) ? book1 : books.find(isReadable);
  const listenBook: Book | undefined = [book1, ...books].find((b) => b && isReadable(b) && !!b.chapters[0]?.audio);
  const fallback = book1 ? `/books/${book1.slug}` : '/#books';
  return {
    readHref: readBook ? `/read/${readBook.slug}?mode=classic&ch=${readBook.chapters[0].id}` : fallback,
    listenHref: listenBook ? `/read/${listenBook.slug}?mode=listen&ch=${listenBook.chapters[0].id}&autoplay=1` : fallback,
    previewSrc: lib && listenBook ? audioUrl(lib, listenBook, listenBook.chapters[0]) : null,
    previewStart: listenBook?.chapters[0].audioStart ?? 0,
  };
}
