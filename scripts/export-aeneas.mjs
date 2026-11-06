#!/usr/bin/env node
/**
 * Export a chapter's sentences in aeneas "parsed" format (id|text), so aeneas returns
 * fragments whose ids are exactly our sentence ids.
 *
 *   node scripts/export-aeneas.mjs --book book-1 [--ch 01]      (all chapters if --ch omitted)
 *
 * Then run aeneas (Python, https://github.com/readbeyond/aeneas) for each chapter, e.g.:
 *   python -m aeneas.tools.execute_task audio/01.mp3 work/book-1/01.txt \
 *     "task_language=eng|is_text_type=parsed|os_task_file_format=json" work/book-1/01.aeneas.json
 * (task_language: eng, hin, pan …)
 * And import:  node scripts/import-alignment.mjs --book book-1 --ch 01 --from work/book-1/01.aeneas.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { allSentences, args, bookDir, LIBRARY, readJSON, ROOT } from './lib.mjs';

const a = args();
const lib = readJSON(LIBRARY);
const book = lib.books.find((b) => b.slug === a.book);
if (!book) {
  console.error('Unknown book', a.book);
  process.exit(1);
}
const chapters = a.ch ? book.chapters.filter((c) => c.id === a.ch) : book.chapters;
const out = path.join(ROOT, 'work', book.slug);
fs.mkdirSync(out, { recursive: true });
for (const c of chapters) {
  const ch = readJSON(path.join(bookDir(book.slug), 'chapters', `${c.id}.json`));
  const lines = allSentences(ch).map((s) => `${s.id}|${s.text.replace(/\|/g, '/')}`);
  fs.writeFileSync(path.join(out, `${c.id}.txt`), lines.join('\n') + '\n', 'utf8');
  console.log(`  work/${book.slug}/${c.id}.txt  (${lines.length} sentences)`);
}
