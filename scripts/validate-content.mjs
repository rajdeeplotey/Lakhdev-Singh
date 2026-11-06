#!/usr/bin/env node
/** Check every book: chapter files, unique ids, audio presence, alignment validity & coverage. */
import fs from 'node:fs';
import path from 'node:path';
import { allSentences, bookDir, CONTENT, LIBRARY, readJSON, ROOT } from './lib.mjs';

const lib = readJSON(LIBRARY);
let errors = 0;
let warnings = 0;
const err = (m) => (errors++, console.log('   ✗ ' + m));
const warn = (m) => (warnings++, console.log('   ! ' + m));

for (const b of lib.books) {
  console.log(`\n■ ${b.slug} — ${b.title}${b.placeholder ? '  [placeholder]' : ''}${b.devOnly ? '  [dev only]' : ''}`);
  if (b.placeholder) {
    warn('placeholder slot — import real chapters with npm run content:import');
    continue;
  }
  if (b.cover && !fs.existsSync(path.join(ROOT, 'public', b.cover))) warn(`cover not found: ${b.cover}`);
  if (!b.cover) warn('no cover image set');
  const dir = bookDir(b.slug);
  let aligned = 0;
  let narrated = 0;
  for (const c of b.chapters) {
    const f = path.join(dir, 'chapters', `${c.id}.json`);
    if (!fs.existsSync(f)) {
      err(`chapter ${c.id}: missing ${path.relative(ROOT, f)}`);
      continue;
    }
    const ch = readJSON(f);
    const sents = allSentences(ch);
    const ids = new Set();
    sents.forEach((s) => (ids.has(s.id) ? err(`chapter ${c.id}: duplicate sentence id ${s.id}`) : ids.add(s.id)));
    if (c.audio) {
      narrated++;
      if (!/^(https?:)?\/\//.test(c.audio) && !lib.audioBaseUrl) {
        const ap = c.audio.startsWith('/') ? path.join(ROOT, 'public', c.audio) : path.join(dir, c.audio);
        if (!fs.existsSync(ap)) err(`chapter ${c.id}: audio not found ${c.audio}`);
      }
    }
    if (c.alignment) {
      const ap = path.join(dir, c.alignment);
      if (!fs.existsSync(ap)) {
        err(`chapter ${c.id}: alignment not found ${c.alignment}`);
        continue;
      }
      const al = readJSON(ap);
      let prev = -1;
      for (const s of al.segments) {
        if (!ids.has(s.id)) err(`chapter ${c.id}: alignment id ${s.id} not in text`);
        if (!(s.end >= s.begin) || s.begin < prev) err(`chapter ${c.id}: bad/unsorted times at ${s.id}`);
        prev = s.begin;
      }
      const cov = al.segments.length / Math.max(1, sents.length);
      if (cov < 0.95) warn(`chapter ${c.id}: alignment covers ${(cov * 100).toFixed(0)}% of sentences`);
      if (!c.audio) warn(`chapter ${c.id}: alignment present but no audio`);
      aligned++;
    } else if (c.audio) warn(`chapter ${c.id}: narrated but NOT synchronised (no alignment)`);
  }
  console.log(`   ${b.chapters.length} chapters · ${narrated} narrated · ${aligned} synchronised`);
}
console.log(`\n${errors} error(s), ${warnings} warning(s)`);
if (!fs.existsSync(path.join(ROOT, 'public', 'brand', 'logo-emblem.png'))) console.log('Note: official logo files not yet added to public/brand/');
process.exit(errors ? 1 : 0);
void CONTENT;
