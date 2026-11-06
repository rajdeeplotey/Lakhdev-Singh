# Dr. Lakhdev Singh — Writer · Author website & digital library

React 18 + Vite + TypeScript, built as a **static site** for Hostinger shared hosting (Single plan: no Node.js server needed).
Book content is loaded at runtime from JSON in `public/content/`, so adding books or chapters does **not** require code changes.

```
npm install
npm run dev              # http://localhost:5173 (also shows the dev-only "Reader Test Sample")
npm run build            # → dist/  (type-check + build + strips dev-only content)
npm test                 # sync-engine unit tests
npm run content:validate # checks every book, audio file and alignment
```

## Where things live

| Path | What |
|---|---|
| `public/brand/` | **Official logo files** (`logo-full.png`, `logo-emblem.png`, `favicon.svg`). See README there. |
| `public/content/site.json` | Hero text, biography, contact details, author photo, logo paths |
| `public/content/library.json` | The six books: title, subtitle, description, cover, language, chapter list, `latestRelease` |
| `public/content/books/<slug>/chapters/NN.json` | Chapter text, split into paragraphs → sentences (`s1`, `s2` …) |
| `public/content/books/<slug>/audio/NN.mp3` | Chapter narration (or on a CDN, see below) |
| `public/content/books/<slug>/alignment/NN.json` | **Real** sentence (and optional word) timestamps |
| `public/images/covers/` | Book covers (WebP/JPEG, ~800×1200, < 200 KB each) |
| `src/` | UI: `sections/` homepage, `reader/` both reader modes + audio sync, `content/` data model & loaders |

## Adding a real book

1. **Text** — one `.txt` or `.md` file per chapter (`01.txt`, `02.txt` …; first line `# Chapter title`; blank line between paragraphs; `## Heading`, `> quote`, `***` scene break are supported):
   ```
   npm run content:import -- --book book-1 --src "D:/Books/Book One/chapters" --lang en --title "Real Title"
   ```
   `--lang hi` / `--lang pa` for Hindi / Punjabi (sentence splitting understands `।`).
2. **Audio** — copy chapter files to `public/content/books/book-1/audio/01.mp3 …` and re-run the import (it auto-links them).
   Recommended encoding for speech: **MP3 64 kbps mono** (~0.5 MB per minute).
3. **Synchronisation** — generate real timestamps with a forced aligner, then import:
   - *aeneas* (sentence level):
     ```
     npm run content:export-aeneas -- --book book-1
     python -m aeneas.tools.execute_task public/content/books/book-1/audio/01.mp3 work/book-1/01.txt "task_language=eng|is_text_type=parsed|os_task_file_format=json" work/book-1/01.aeneas.json
     npm run content:import-alignment -- --book book-1 --ch 01 --from work/book-1/01.aeneas.json
     ```
   - *WhisperX / stable-ts* (word level → also enables word highlighting): export word JSON, then
     `npm run content:import-alignment -- --book book-1 --ch 01 --from 01.whisperx.json`
   The importer never estimates anything: unmatched sentences are left without timing and reported.
4. **Cover & details** — set `cover`, `coverWidth`, `coverHeight`, `subtitle`, `description` in `library.json`; set `latestRelease` to the newest book's slug.
5. `npm run content:validate`

A chapter with audio but no alignment still plays; the listening view says sync is not yet available for it.

## Deploying to Hostinger (Single Web Hosting)

1. `npm run build`
2. hPanel → **File Manager** → `public_html/` → upload the **contents** of `dist/` (zip it, upload, Extract). Make sure the hidden `.htaccess` is included.
3. hPanel → enable **SSL** for the domain.
4. Open `/`, a `/books/<slug>` page and a `/read/<slug>` page directly in the browser. They must all load (the `.htaccess` file handles this).

Content-only updates (new chapter JSON, audio, alignment, bio) are just file uploads to `public_html/content/...`. No rebuild is needed.

### Audio storage

Six books × ~20 chapters of narration at 64 kbps mono is typically **0.5–1.5 GB**, which fits the Single plan's storage. The real constraint on shared hosting is **bandwidth and concurrent connections** when many people stream at once. Check your current plan limits in hPanel. Recommendation:

- **Start** with audio on Hostinger itself (simplest; the `.htaccess` sets correct MIME types and caching; browsers stream with range requests).
- **If traffic grows**, move only the audio to object storage with a CDN (e.g. Cloudflare R2, free egress, or Bunny Storage + CDN). Upload as `<bucket>/<book-slug>/audio/NN.mp3`, then set `"audioBaseUrl": "https://audio.yourdomain.com/"` in `library.json`. No code change is needed. Enable CORS (GET, Range) on the bucket.

Audio is never preloaded: only the current chapter's metadata loads until the visitor presses play.

## Reader features

- **Classic Book Mode:** real pagination (CSS columns measured per sentence, so it stays accurate at any screen or font size), two-page spreads with page-curl turns on desktop, swipe on touch, page numbers, chapter navigation, font size, Ivory/Sepia/Night paper, bookmarks, auto page-turn following the narration.
- **Immersive Listening Mode:** large continuous text, narrated sentence (and word, when available) highlighted, auto-scroll that pauses when you scroll yourself ("Return to narration"), tap a sentence to play from it, ±10 s, speed 0.75–2×, sleep timer (minutes or end of chapter), auto-advance to the next chapter.
- **Switching modes** keeps chapter, sentence and audio position. Position, bookmarks and preferences persist in the browser (localStorage).
- **Keyboard:** Space play/pause · ←/→ pages (Book) or ±10 s (Listen) · J/L ±10 s · B bookmark · M switch mode.
- **Lock-screen controls** on phones (Media Session).

## Developer test fixture

`reader-test-sample` (dev builds only, removed by `npm run build`) uses Windows text-to-speech audio with the speech engine's real word timings (`scripts/dev/make-sample-audio.ps1`). It exists only to verify the sync engine. It is not the author's work.

## Demo books (Book 1 & Book 2)

`book-1` (*The Lantern Keeper*) and `book-2` (*Letters from the River*) are **demo books** so the site can be tried before the
author's books are added: short sample texts (source in `content-src/demo/`) with **synthetic narration** generated by Windows
text-to-speech, whose real word timings drive the highlighting. They are labelled "Demo book" on the site and on their covers,
are marked `"demo": true` in `library.json`, and are not counted in the About section's stats.

To replace a demo with a real book: delete `public/content/books/book-1/`, then run `npm run content:import` with the real
chapters (and audio/alignment), and update the title, subtitle, description and cover in `library.json`.
