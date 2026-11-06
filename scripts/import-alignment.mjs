#!/usr/bin/env node
/**
 * Convert REAL forced-alignment output into the reader's alignment format.
 * Nothing is estimated: sentences/words without a real timestamp are left out and reported.
 *
 *   node scripts/import-alignment.mjs --book book-1 --ch 01 --from 01.aeneas.json [--format aeneas|words]
 *
 * Supported inputs
 *  aeneas : {"fragments":[{"id":"s1","begin":"0.000","end":"2.480", ...}]}   (export-aeneas.mjs ids)
 *  words  : word-level transcripts — WhisperX / stable-ts / Gentle-like:
 *           {"segments":[{"words":[{"word":"Hello","start":0.1,"end":0.4}, ...]}]}
 *           or {"words":[{"word"|"text":"Hello","start":0.1,"end":0.4}]}
 *           Words are matched to the book text in order (normalised), giving sentence AND word timings.
 */
import fs from 'node:fs';
import path from 'node:path';
import { allSentences, args, bookDir, LIBRARY, norm, readJSON, writeJSON } from './lib.mjs';

const a = args();
if (!a.book || !a.ch || !a.from) {
  console.error('Usage: --book <slug> --ch <id> --from <file.json> [--format aeneas|words] [--source "tool name"]');
  process.exit(1);
}
const lib = readJSON(LIBRARY);
const book = lib.books.find((b) => b.slug === a.book);
const ref = book?.chapters.find((c) => c.id === a.ch);
if (!ref) {
  console.error('Unknown book/chapter');
  process.exit(1);
}
const dir = bookDir(book.slug);
const chapter = readJSON(path.join(dir, 'chapters', `${a.ch}.json`));
const sentences = allSentences(chapter);
const input = readJSON(a.from);
const format = a.format || (input.fragments ? 'aeneas' : 'words');

let segments = [];
let source = a.source;

if (format === 'aeneas') {
  source ??= 'aeneas forced alignment';
  const ids = new Set(sentences.map((s) => s.id));
  const frags = input.fragments ?? [];
  segments = frags
    .filter((f) => ids.has(f.id))
    .map((f) => ({ id: f.id, begin: round(+f.begin), end: round(+f.end) }))
    .filter((f) => f.end > f.begin);
  const missing = sentences.length - segments.length;
  if (frags.length && !segments.length)
    console.warn('! No fragment ids matched sentence ids. Did you export with export-aeneas.mjs (is_text_type=parsed)?');
  if (missing) console.warn(`! ${missing} sentence(s) have no timing.`);
} else {
  source ??= input.source || 'word-level forced alignment';
  const words = (input.segments ? input.segments.flatMap((s) => s.words ?? []) : input.words ?? [])
    .map((w) => ({ t: norm(String(w.word ?? w.text ?? '')), start: +w.start, end: +w.end }))
    .filter((w) => w.t && isFinite(w.start) && isFinite(w.end));
  let wi = 0;
  const WINDOW = 12;
  let matched = 0;
  let total = 0;
  for (const s of sentences) {
    const tokens = s.text.trim().split(/\s+/);
    const times = tokens.map((tok) => {
      const n = norm(tok);
      total++;
      if (!n) return null;
      for (let k = wi; k < Math.min(words.length, wi + WINDOW); k++) {
        if (words[k].t === n) {
          wi = k + 1;
          matched++;
          return [round(words[k].start), round(words[k].end)];
        }
      }
      return null;
    });
    const got = times.filter(Boolean);
    if (!got.length) continue;
    const seg = { id: s.id, begin: got[0][0], end: got[got.length - 1][1] };
    if (got.length === tokens.length) seg.words = times;
    segments.push(seg);
  }
  console.log(`  matched ${matched}/${total} words (${((matched / Math.max(1, total)) * 100).toFixed(1)}%)`);
  if (matched / Math.max(1, total) < 0.85)
    console.warn('! Low match rate — check that the audio and the chapter text are the same version.');
}

segments.sort((x, y) => x.begin - y.begin);
// end of a sentence never overlaps the next sentence's start
for (let i = 0; i < segments.length - 1; i++) segments[i].end = Math.min(segments[i].end, segments[i + 1].begin) || segments[i].end;

const out = { source, audio: ref.audio, segments };
writeJSON(path.join(dir, 'alignment', `${a.ch}.json`), out);
ref.alignment = `alignment/${a.ch}.json`;
writeJSON(LIBRARY, lib);
const withWords = segments.filter((s) => s.words).length;
console.log(`✓ ${segments.length}/${sentences.length} sentences aligned (${withWords} with word timings) → alignment/${a.ch}.json`);

function round(n) {
  return Math.round(n * 1000) / 1000;
}
