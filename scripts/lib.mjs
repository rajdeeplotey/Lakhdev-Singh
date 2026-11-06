// Shared helpers for content tooling (Node 18+, no dependencies).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT = path.join(ROOT, 'public', 'content');
export const LIBRARY = path.join(CONTENT, 'library.json');
export const bookDir = (slug) => path.join(CONTENT, 'books', slug);

export function args() {
  const out = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
      out[k] = v;
    }
  }
  return out;
}

export const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
export const writeJSON = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');
};

/** Sentence segmentation via ICU (handles English, Hindi danda ।, Punjabi, etc.). */
export function splitSentences(text, lang = 'en') {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const seg = new Intl.Segmenter(lang, { granularity: 'sentence' });
  const out = [];
  for (const { segment } of seg.segment(clean)) {
    const s = segment.trim();
    if (!s) continue;
    // merge very short fragments (e.g. "Dr." false splits) into the previous sentence
    if (out.length && /^(Dr|Mr|Mrs|Ms|St|Prof|Sr|Jr)\.$/i.test(out[out.length - 1].split(' ').pop())) {
      out[out.length - 1] += ' ' + s;
    } else out.push(s);
  }
  return out;
}

/**
 * Plain text / Markdown → ChapterText.
 *  "# Title" first line (optional) · blank line = new paragraph · "## Heading" · "> quote" · "***" scene break
 */
export function parseChapter(raw, { id, title, lang }) {
  const lines = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  let t = title;
  if (lines[0]?.startsWith('# ')) t = lines.shift().slice(2).trim();
  const blocks = lines.join('\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  let sn = 0;
  const paragraphs = blocks.map((b, i) => {
    const pid = `p${i + 1}`;
    if (/^(\*\s*){3,}$|^(-\s*){3,}$|^⁂$/.test(b)) return { id: pid, kind: 'break', sentences: [] };
    let kind = 'p';
    let body = b;
    if (b.startsWith('## ')) {
      kind = 'h';
      body = b.slice(3);
    } else if (b.startsWith('>')) {
      kind = 'quote';
      body = b.replace(/^>\s?/gm, '');
    }
    const sentences = (kind === 'h' ? [body.replace(/\s+/g, ' ').trim()] : splitSentences(body, lang)).map((s) => ({
      id: `s${++sn}`,
      text: s,
    }));
    const p = { id: pid, sentences };
    if (kind !== 'p') p.kind = kind;
    return p;
  });
  return { id, title: t ?? `Chapter ${id}`, paragraphs };
}

export const allSentences = (ch) => ch.paragraphs.flatMap((p) => p.sentences);

export const norm = (w) =>
  w
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '');
