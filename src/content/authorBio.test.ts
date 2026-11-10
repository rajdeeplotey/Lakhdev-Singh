import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { parseAuthorBio } from './authorBio';

const md = fs.readFileSync('public/content/author-bio.md', 'utf8');
const bio = parseAuthorBio(md);
const lines = new Set(md.split(/\r?\n/).map((l) => l.trim()));

describe('author-bio.md', () => {
  it('has the same structure in English and Punjabi', () => {
    for (const id of ['en', 'pa'] as const) {
      expect(bio[id].intro.paragraphs).toHaveLength(1);
      expect(bio[id].sections).toHaveLength(5);
      expect(bio[id].timeline.items).toHaveLength(7);
    }
    expect(bio.en.sections.map((s) => s.heading)).toEqual([
      'Education and Career',
      'Spiritual Life',
      'Literary Work',
      'Sports and Achievements',
      'Gatka and Martial Arts',
    ]);
    expect(bio.pa.timeline.heading).toBe('ਇਕ ਨਜ਼ਰ ਵਿਚ');
    expect(bio.en.timeline.heading).toBe('At a glance');
  });

  it('keeps every piece of text exactly as written in the file (nothing rewritten)', () => {
    for (const id of ['en', 'pa'] as const) {
      const b = bio[id];
      for (const s of [b.intro, ...b.sections]) {
        expect(lines.has(`### ${s.heading}`)).toBe(true);
        for (const p of s.paragraphs) expect(lines.has(p)).toBe(true);
        for (const it of s.items) expect(lines.has(`- ${it}`)).toBe(true);
      }
      for (const t of b.timeline.items) expect(lines.has(`- ${t.year} — ${t.text}`)).toBe(true);
    }
  });

  it('achievements are a list, the other sections are paragraphs', () => {
    for (const id of ['en', 'pa'] as const) {
      const lists = bio[id].sections.filter((s) => s.items.length);
      expect(lists).toHaveLength(1);
      expect(lists[0].items).toHaveLength(6);
    }
  });
});
