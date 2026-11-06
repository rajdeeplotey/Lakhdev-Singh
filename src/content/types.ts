/**
 * Content model — kept entirely separate from the UI.
 *
 * public/content/site.json                        → SiteContent
 * public/content/library.json                     → Library (catalogue of books)
 * public/content/books/<slug>/chapters/<id>.json  → ChapterText
 * public/content/books/<slug>/alignment/<id>.json → Alignment (real timestamps only)
 * audio: <audioBaseUrl>/<slug>/<file>  or  /content/books/<slug>/<file>
 */

export interface SiteContent {
  author: string;
  role: string;
  hero: { eyebrow: string; headline: string; intro: string };
  about: {
    heading: string;
    paragraphs: string[];
    /** Pull quote shown beside the portrait (author's own words). */
    quote?: string;
    /** Portrait (WebP) and JPEG fallback. */
    photo?: string;
    photoFallback?: string;
    photoAlt?: string;
    /** Total narration length in hours, shown in the stats row. null/absent → "—". */
    narratedHours?: number | null;
    /** 30–60 s welcome recording, e.g. "/audio/welcome.mp3". */
    welcomeAudio?: string;
  };
  readListen: { heading: string; body: string };
  contact: { email?: string; phone?: string; address?: string; social?: { label: string; url: string }[] };
  brand: { logoFull: string; logoEmblem: string; logoStacked?: string };
}

export interface ChapterRef {
  /** e.g. "01" — also the filename stem of chapters/<id>.json */
  id: string;
  title: string;
  /** Audio path relative to the book folder (or audioBaseUrl/<slug>/). Absolute URLs allowed. */
  audio?: string;
  /** Alignment JSON relative to the book folder. Omit until REAL alignment exists. */
  alignment?: string;
  /** When one audio file covers several chapters: where this chapter starts/ends (seconds). */
  audioStart?: number;
  audioEnd?: number;
}

export interface Book {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** Cover image path relative to site root. */
  cover?: string;
  coverWidth?: number;
  coverHeight?: number;
  /** BCP-47 language of the text: "en", "hi", "pa" … sets lang= for fonts & hyphenation. */
  language?: string;
  /** True for the configurable slots shown until real books are supplied. */
  placeholder?: boolean;
  /** Developer sample — listed only in dev builds. */
  devOnly?: boolean;
  chapters: ChapterRef[];
}

export interface Library {
  /** Optional CDN/bucket base for audio (e.g. https://audio.example.com/). Empty = served from this site. */
  audioBaseUrl?: string;
  /** slug of the book featured in "Latest Release" */
  latestRelease?: string;
  books: Book[];
}

export interface Sentence {
  /** unique within the chapter, e.g. "s12" */
  id: string;
  text: string;
}
export interface Paragraph {
  id: string;
  /** "p" paragraph (default), "h" sub-heading, "quote", "break" scene break */
  kind?: 'p' | 'h' | 'quote' | 'break';
  sentences: Sentence[];
}
export interface ChapterText {
  id: string;
  title: string;
  paragraphs: Paragraph[];
}

/** One aligned segment. begin/end are seconds in the chapter's audio file. */
export interface AlignedSegment {
  /** matches Sentence.id */
  id: string;
  begin: number;
  end: number;
  /** Optional word-level timings: [begin, end] per whitespace-separated token of the sentence. */
  words?: [number, number][];
}
export interface Alignment {
  /** Provenance, e.g. "aeneas 1.7.3" or "whisperx forced alignment". */
  source: string;
  audio?: string;
  duration?: number;
  segments: AlignedSegment[];
}
