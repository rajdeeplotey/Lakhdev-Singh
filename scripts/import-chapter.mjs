#!/usr/bin/env node
/**
 * Import chapter text files for one book.
 *
 *   node scripts/import-chapter.mjs --book book-1 --src "D:/books/Book One/chapters" [--lang en] [--title "Real Title"]
 *
 * --src: a folder of .txt/.md files, one per chapter, sorted by filename (01.txt, 02.txt …).
 *        First line "# Chapter title" is used as the chapter title (else the filename).
 * Writes public/content/books/<book>/chapters/<NN>.json and updates library.json:
 *   - chapter list (keeps existing audio/alignment references)
 *   - auto-links audio/<NN>.mp3|m4a|ogg and alignment/<NN>.json if those files exist
 *   - clears the "placeholder" flag
 */
import fs from 'node:fs';
import path from 'node:path';
import { args, bookDir, LIBRARY, parseChapter, readJSON, writeJSON } from './lib.mjs';

const a = args();
if (!a.book || !a.src) {
  console.error('Usage: --book <slug> --src <folder> [--lang en|hi|pa] [--title "Book title"]');
  process.exit(1);
}
const lib = readJSON(LIBRARY);
let book = lib.books.find((b) => b.slug === a.book);
if (!book) {
  book = { slug: a.book, title: a.title || a.book, chapters: [] };
  lib.books.push(book);
}
const lang = a.lang || book.language || 'en';
book.language = lang;
if (a.title) book.title = a.title;

const files = fs
  .readdirSync(a.src)
  .filter((f) => /\.(txt|md)$/i.test(f))
  .sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
if (!files.length) {
  console.error('No .txt/.md files found in', a.src);
  process.exit(1);
}

const dir = bookDir(a.book);
const existing = new Map(book.chapters.map((c) => [c.id, c]));
const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'ogg', 'opus', 'wav'];

book.chapters = files.map((f, i) => {
  const id = String(i + 1).padStart(2, '0');
  const raw = fs.readFileSync(path.join(a.src, f), 'utf8');
  const ch = parseChapter(raw, { id, title: path.basename(f).replace(/\.(txt|md)$/i, ''), lang });
  writeJSON(path.join(dir, 'chapters', `${id}.json`), ch);
  const ref = { ...(existing.get(id) ?? {}), id, title: ch.title };
  const audio = AUDIO_EXT.map((e) => `audio/${id}.${e}`).find((p) => fs.existsSync(path.join(dir, p)));
  if (audio && !ref.audio) ref.audio = audio;
  if (fs.existsSync(path.join(dir, 'alignment', `${id}.json`))) ref.alignment = `alignment/${id}.json`;
  const n = ch.paragraphs.reduce((s, p) => s + p.sentences.length, 0);
  console.log(`  ${id}  ${ch.title}  (${n} sentences)${ref.audio ? '  ♪' : ''}${ref.alignment ? '  ⇄' : ''}`);
  return ref;
});
delete book.placeholder;
writeJSON(LIBRARY, lib);
console.log(`\n✓ ${book.chapters.length} chapters imported into "${book.slug}". Run: npm run content:validate`);
