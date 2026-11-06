#!/usr/bin/env node
// Post-build: remove developer-only books (devOnly: true) and their files from dist/.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJSON, writeJSON } from './lib.mjs';

const dist = path.join(ROOT, 'dist');
const libPath = path.join(dist, 'content', 'library.json');
if (!fs.existsSync(libPath)) process.exit(0);
const lib = readJSON(libPath);
const dev = lib.books.filter((b) => b.devOnly);
lib.books = lib.books.filter((b) => !b.devOnly);
writeJSON(libPath, lib);
for (const b of dev) {
  fs.rmSync(path.join(dist, 'content', 'books', b.slug), { recursive: true, force: true });
  console.log(`stripped dev-only book: ${b.slug}`);
}
