import type { SiteContent } from './types';

/** Site text (hero, biography, contact…) — public/content/site.json. Books live in books.json (see books.ts). */
export async function loadSite(): Promise<SiteContent> {
  const r = await fetch('/content/site.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${r.status} loading site.json`);
  return r.json();
}
