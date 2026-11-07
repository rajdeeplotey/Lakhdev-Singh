import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import type { BooksData } from './books';

/** Guards the book data file: Gurmukhi must stay exact Unicode, chapters must point inside the book. */
const data = JSON.parse(fs.readFileSync('public/content/books.json', 'utf8')) as BooksData;
const GURMUKHI = /[਀-੿]/;
// signs of text copied from a PDF's visual-order layer: a vowel sign/ਿ at the start of a word, or stray gaps
const BROKEN = /(^|[\s(“"‘'])[ਾ-ੌੰੱ]|[ਕ-ਹ] [ਾ-ੌ]| {2,}/;

describe('books.json', () => {
  it('has books with unique slugs and a valid featured book', () => {
    expect(data.books.length).toBeGreaterThan(0);
    const slugs = data.books.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain(data.featured);
  });

  for (const b of data.books) {
    describe(b.slug, () => {
      it('has a Gurmukhi title (NFC) and an English title', () => {
        expect(b.titlePa).toMatch(GURMUKHI);
        expect(b.titlePa).toBe(b.titlePa.normalize('NFC'));
        expect(b.titleEn).toMatch(/[A-Za-z]/);
      });
      it('points to a Heyzine flipbook and an existing cover', () => {
        expect(b.heyzine).toMatch(/^https:\/\/heyzine\.com\/flip-book\/[a-z0-9]+\.html$/);
        expect(fs.existsSync('public' + b.cover)).toBe(true);
      });
      it('has chapters numbered 1..n, in page order, inside the book', () => {
        b.chapters.forEach((c, i) => {
          expect(c.n).toBe(i + 1);
          expect(c.heyzinePage).toBeGreaterThanOrEqual(1);
          expect(c.heyzinePage).toBeLessThanOrEqual(b.pages);
          if (i > 0) expect(c.heyzinePage).toBeGreaterThan(b.chapters[i - 1].heyzinePage);
        });
      });
      it('has chapter titles in clean Unicode Gurmukhi', () => {
        for (const c of b.chapters) {
          expect(c.pa, `chapter ${c.n}`).toMatch(GURMUKHI);
          expect(c.pa, `chapter ${c.n}`).toBe(c.pa.normalize('NFC'));
          expect(BROKEN.test(c.pa), `chapter ${c.n} looks scrambled: ${c.pa}`).toBe(false);
          expect(/[-�]/.test(c.pa), `chapter ${c.n} has private-use chars`).toBe(false);
        }
      });
    });
  }
});
