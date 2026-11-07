/** Site text model — public/content/site.json. Book data: see books.ts / public/content/books.json. */

export interface SiteContent {
  author: string;
  /** Name split for the large hero typography, e.g. { prefix: "Dr.", first: "Lakhdev", last: "Singh" } */
  authorParts: { prefix: string; first: string; last: string };
  role: string;
  /** Translations: any field above, e.g. { "pa": { "hero": { "headline": "…" } } } */
  i18n?: { pa?: Record<string, unknown> };
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
    /** Total narration length in hours for the stats row; null/absent → the total page count is shown. */
    narratedHours?: number | null;
    /** 30–60 s welcome recording, e.g. "/audio/welcome.mp3". */
    welcomeAudio?: string;
  };
  readListen: { heading: string; body: string };
  contact: { email?: string; phone?: string; address?: string; social?: { label: string; url: string }[] };
  /** All point to the official round logo (the one used inside the Heyzine books); logoSmall = 160px copy for small spots. */
  brand: { logoFull: string; logoEmblem: string; logoStacked?: string; logoSmall?: string };
}
