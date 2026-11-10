/**
 * The author's biography lives in ONE file: public/content/author-bio.md (English and ਪੰਜਾਬੀ).
 * This parser only splits that file into sections; it never changes a single character of the text,
 * so the website always shows the biography exactly as written in the file.
 *
 * File shape:
 *   ## ENGLISH            → English part        ## ਪੰਜਾਬੀ → Punjabi part
 *   ### Heading           → a new section (first = short introduction, last = "At a glance" timeline)
 *   - item                → list item (achievements list, timeline "year — text")
 *   any other line        → a paragraph
 */
export type BioLangId = 'en' | 'pa';

export interface BioSection {
  heading: string;
  paragraphs: string[];
  items: string[];
}

export interface BioLang {
  intro: BioSection;
  sections: BioSection[]; // body sections between the introduction and the timeline, in file order
  timeline: { heading: string; items: { year: string; text: string }[] };
}

export type AuthorBio = Record<BioLangId, BioLang>;

export function parseAuthorBio(md: string): AuthorBio {
  const raw: Partial<Record<BioLangId, BioSection[]>> = {};
  let lang: BioLangId | null = null;
  let cur: BioSection | null = null;
  for (const line of md.split(/\r?\n/)) {
    const s = line.trimEnd();
    if (s.startsWith('## ')) {
      const name = s.slice(3).trim();
      lang = /^english$/i.test(name) ? 'en' : /^ਪੰਜਾਬੀ$/.test(name) ? 'pa' : null;
      if (lang) raw[lang] = [];
      cur = null;
    } else if (!lang) {
      continue; // document title and anything before the first language
    } else if (s.startsWith('### ')) {
      cur = { heading: s.slice(4).trim(), paragraphs: [], items: [] };
      raw[lang]!.push(cur);
    } else if (!cur || s.trim() === '' || s.trim() === '---') {
      continue;
    } else if (s.startsWith('- ')) {
      cur.items.push(s.slice(2).trim());
    } else {
      cur.paragraphs.push(s.trim());
    }
  }
  const build = (id: BioLangId): BioLang => {
    const secs = raw[id];
    if (!secs || secs.length < 2) throw new Error(`author-bio.md: the ${id === 'en' ? 'ENGLISH' : 'ਪੰਜਾਬੀ'} part is missing or incomplete`);
    const last = secs[secs.length - 1];
    return {
      intro: secs[0],
      sections: secs.slice(1, -1),
      timeline: {
        heading: last.heading,
        items: last.items.map((it) => {
          const i = it.indexOf(' — ');
          return i < 0 ? { year: '', text: it } : { year: it.slice(0, i), text: it.slice(i + 3) };
        }),
      },
    };
  };
  return { en: build('en'), pa: build('pa') };
}

let cache: Promise<AuthorBio> | null = null;
/** Loads and parses /content/author-bio.md once per page visit. */
export function loadAuthorBio(): Promise<AuthorBio> {
  if (!cache) {
    cache = fetch('/content/author-bio.md', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`author-bio.md: HTTP ${r.status}`);
        return r.text();
      })
      .then(parseAuthorBio);
    cache.catch(() => (cache = null));
  }
  return cache;
}
