import type { Alignment, Book, ChapterRef, ChapterText, Library, SiteContent } from './types';

const cache = new Map<string, Promise<unknown>>();

function getJSON<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    const p = fetch(url, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`${r.status} loading ${url}`);
      return r.json();
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return cache.get(url) as Promise<T>;
}

const isAbs = (u: string) => /^(https?:)?\/\//.test(u) || u.startsWith('/');

export const bookBase = (slug: string) => `/content/books/${encodeURIComponent(slug)}/`;

export function loadSite() {
  return getJSON<SiteContent>('/content/site.json');
}

export async function loadLibrary(): Promise<Library> {
  const lib = await getJSON<Library>('/content/library.json');
  return { ...lib, books: lib.books.filter((b) => !b.devOnly || import.meta.env.DEV) };
}

export function loadChapter(book: Book, ch: ChapterRef) {
  return getJSON<ChapterText>(`${bookBase(book.slug)}chapters/${ch.id}.json`);
}

export function loadAlignment(book: Book, ch: ChapterRef): Promise<Alignment | null> {
  if (!ch.alignment) return Promise.resolve(null);
  const url = isAbs(ch.alignment) ? ch.alignment : bookBase(book.slug) + ch.alignment;
  return getJSON<Alignment>(url).catch(() => null);
}

export function audioUrl(lib: Library, book: Book, ch: ChapterRef): string | null {
  if (!ch.audio) return null;
  if (isAbs(ch.audio)) return ch.audio;
  if (lib.audioBaseUrl) return lib.audioBaseUrl.replace(/\/?$/, '/') + `${book.slug}/` + ch.audio;
  return bookBase(book.slug) + ch.audio;
}

export const isReadable = (b: Book) => !b.placeholder && b.chapters.length > 0;
export const hasAudio = (b: Book) => b.chapters.some((c) => !!c.audio);
