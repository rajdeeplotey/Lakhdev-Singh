# Dr. Lakhdev Singh (ਡਾ. ਲਖਦੇਵ ਸਿੰਘ) — author website

React 18 + Vite + TypeScript, built as a **static site** for Hostinger shared hosting (Single plan: no Node.js server needed).
The books are **Heyzine flipbooks**, shown exactly as Heyzine shows them, in a full-screen viewer on the site.

```
npm install
npm run dev     # http://localhost:5173
npm run build   # → dist/  (type-check + build; book titles/chapters are written into index.html for Google)
npm test        # checks public/content/books.json (Unicode Gurmukhi, chapter pages)
```

## Where things live

| Path | What |
|---|---|
| `public/content/books.json` | **The books** — one entry per book (title, cover, Heyzine link, chapters) |
| `public/content/site.json` | Hero text, biography, quote, contact details, portrait, logo paths (English + `i18n.pa` Punjabi) |
| `public/images/covers/` | Book covers, `book-N-cover.webp`, 600px wide |
| `public/brand/` | Official logo files |
| `src/components/BookViewer.tsx` | Full-screen Heyzine viewer (iframe only exists while open) |
| `src/lib/viewer.ts` | Opens/closes the viewer through the URL (`#book-<slug>`), handles Back/Esc |
| `src/i18n/` | English / ਪੰਜਾਬੀ interface text (language switch in the header) |

## Adding a book

1. Make the flipbook in Heyzine and copy its link, e.g. `https://heyzine.com/flip-book/xxxxxxxxxx.html`.
2. Save the cover (first page) as `public/images/covers/book-4-cover.webp`, 600px wide.
3. Add one entry to `public/content/books.json`:

```json
{
  "id": 4,
  "slug": "gurmat-guhaj-vichar-4",
  "titlePa": "…exact title, copied (not typed) …",
  "titleEn": "Gurmat Guhaj Vichar (Part 4)",
  "cover": "/images/covers/book-4-cover.webp", "coverWidth": 600, "coverHeight": 849,
  "heyzine": "https://heyzine.com/flip-book/xxxxxxxxxx.html",
  "descriptionPa": "",
  "pages": 140,
  "chaptersConfirmed": true,
  "chapters": [ { "n": 1, "pa": "…", "page": 7, "heyzinePage": 5 } ]
}
```

* `page` = the page number **printed** in the book; `heyzinePage` = the page in the flipbook (`#page/N`), which counts the
  cover and front pages too — they differ (in Part 1 by 2 pages). Chapter links use `heyzinePage`.
* A chapter list is shown on the site only when `chaptersConfirmed` is `true`.
* `featured` (top of the file) = the book shown under "Latest Release".
* Run `npm test` — it rejects scrambled Gurmukhi (e.g. text copied from a PDF's text layer, where ਿ comes out first: ਗੁਰਮਿਤ instead of ਗੁਰਮਤਿ).

**Gurmukhi rule:** copy titles from a correctly encoded source (e.g. Heyzine's outline, the original Word file); never retype
or “fix” spelling. Mark Punjabi text with `lang="pa"`; the CSS gives it Noto Serif/Sans Gurmukhi, line-height 1.4/1.8 and
removes letter-spacing/capitals automatically.

## Deploying to Hostinger (Single Web Hosting)

1. `npm run build`
2. hPanel → **File Manager** → `public_html/` → upload the **contents** of `dist/` (zip, upload, Extract). Include the hidden `.htaccess`.
3. Enable **SSL** for the domain.

Content-only updates (`books.json`, `site.json`, covers) are just file uploads to `public_html/content/…` / `images/…`.
Re-run `npm run build` when a book is added so the Google-readable text in `index.html` includes it.
