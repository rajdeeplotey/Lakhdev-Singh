/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import { parseAuthorBio } from './src/content/authorBio';

// Static build for Hostinger shared hosting (Apache/LiteSpeed, no Node runtime needed).
// `base: '/'` assumes the site is served from the domain root (public_html).

interface Book {
  slug: string;
  titlePa: string;
  titleEn: string;
  cover: string;
  heyzine: string;
  descriptionPa?: string;
  pages: number;
  chaptersConfirmed: boolean;
  chapters: { n: number; pa: string }[];
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * SEO: put the books into index.html as real text at build time (title, description, JSON-LD and a plain
 * HTML list of books + chapters inside #root, which React replaces when it starts). Google can read the
 * books even without running JavaScript, and the text inside the Heyzine iframe is not needed for search.
 */
function booksSeo(): Plugin {
  return {
    name: 'books-seo',
    transformIndexHtml(html) {
      const { books } = JSON.parse(fs.readFileSync('public/content/books.json', 'utf8')) as { books: Book[] };
      const titles = books.map((b) => b.titlePa);
      const title = `Dr. Lakhdev Singh (ਡਾ. ਲਖਦੇਵ ਸਿੰਘ) — ${titles.join(' · ')}`;
      // meta description = the English short introduction from author-bio.md, exactly as written
      const bio = parseAuthorBio(fs.readFileSync('public/content/author-bio.md', 'utf8'));
      const desc = bio.en.intro.paragraphs.join(' ');
      const ld = {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Person', '@id': '#author', name: 'Dr. Lakhdev Singh', alternateName: 'ਡਾ. ਲਖਦੇਵ ਸਿੰਘ', jobTitle: 'Writer', description: desc },
          ...books.map((b) => ({
            '@type': 'Book',
            name: b.titlePa,
            alternateName: b.titleEn,
            inLanguage: 'pa',
            numberOfPages: b.pages,
            image: b.cover,
            url: b.heyzine,
            author: { '@id': '#author' },
            isAccessibleForFree: true,
            ...(b.descriptionPa ? { description: b.descriptionPa } : {}),
          })),
        ],
      };
      const body = `<main class="prerender">
  <h1>Dr. Lakhdev Singh · <span lang="pa">ਡਾ. ਲਖਦੇਵ ਸਿੰਘ</span></h1>
  <section id="about">
    ${(['pa', 'en'] as const)
      .map((l) => [bio[l].intro, ...bio[l].sections].map((s) => `<div lang="${l}"><h2>${esc(s.heading)}</h2>${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}${s.items.length ? `<ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}</div>`).join(''))
      .join('\n    ')}
  </section>
  ${books
    .map(
      (b) => `<section id="b-${b.slug}">
    <h2 lang="pa">${esc(b.titlePa)}</h2>
    <p>${esc(b.titleEn)} · ${b.pages} pages · <a href="${esc(b.heyzine)}">Read online</a></p>
    ${b.descriptionPa ? `<p lang="pa">${esc(b.descriptionPa)}</p>` : ''}
    ${b.chaptersConfirmed ? `<ol lang="pa">${b.chapters.map((c) => `<li>${esc(c.pa)}</li>`).join('')}</ol>` : ''}
  </section>`,
    )
    .join('\n  ')}
</main>`;
      return html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}" />`)
        .replace('</head>', `    <script type="application/ld+json">${JSON.stringify(ld)}</script>\n  </head>`)
        .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), booksSeo()],
  build: {
    target: 'es2019',
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
  test: { environment: 'node' },
});
