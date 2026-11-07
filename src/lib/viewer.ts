import { useSyncExternalStore } from 'react';

/**
 * Book viewer state lives in the URL hash so it can be shared and closes with the Back button:
 *   #book-<slug>            → open the book
 *   #book-<slug>/page/<N>   → open the book at flipbook page N
 *
 * History handling: Heyzine adds a browser-history entry on every page turn (its iframe changes its own
 * #page/N). Left alone, Back would step through the pages one by one before closing the book. So while the
 * viewer is open we keep OUR entry on top of the stack (re-pushed after every entry the iframe adds). The
 * first Back then pops our entry (a top-level popstate we can see), and we jump over all the viewer's entries
 * back to where the visitor was before opening the book. ✕ and Esc do the same jump.
 */
export interface ViewerState {
  slug: string;
  page?: number;
}
const RE = /^#book-([a-z0-9-]+?)(?:\/page\/(\d+))?$/;

export function parseHash(hash: string): ViewerState | null {
  const m = hash.match(RE);
  return m ? { slug: m[1], page: m[2] ? Number(m[2]) : undefined } : null;
}
const hashFor = (v: ViewerState) => `#book-${v.slug}${v.page && v.page > 1 ? `/page/${v.page}` : ''}`;
const pageUrl = (hash = '') => location.pathname + location.search + hash;

interface Session {
  /** history.length when the visitor's own (pre-book) entry was the newest */
  baseLen: number;
  /** history.length right after our latest push */
  lastLen: number;
  url: string;
  n: number;
}
let session: Session | null = null;
let closing = false;
let poll = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function pushOurs() {
  if (!session) return;
  session.n++;
  history.pushState({ lsViewer: session.n }, '', session.url);
  session.lastLen = history.length;
}

// re-push our entry whenever the flipbook iframe has added history entries
function keepOnTop() {
  if (session && history.length > session.lastLen) pushOurs();
}

function start(url: string) {
  session = { baseLen: 0, lastLen: 0, url, n: 0 };
  pushOurs();
  // measured AFTER the push: pushing discards any old "forward" entries, which history.length still
  // counted before (e.g. from a book closed earlier)
  session.baseLen = history.length - 1;
  window.clearInterval(poll);
  poll = window.setInterval(keepOnTop, 300);
}

function finish(steps: number) {
  window.clearInterval(poll);
  session = null;
  closing = true; // hide the viewer immediately, even before the history jump lands
  emit();
  if (steps > 0) history.go(-steps);
  else {
    closing = false;
    emit();
  }
}

export function openBook(slug: string, page?: number) {
  const url = pageUrl(hashFor({ slug, page }));
  closing = false;
  if (session) {
    // already open (e.g. another chapter): just retarget our entry
    session.url = url;
    history.replaceState({ lsViewer: session.n }, '', url);
  } else start(url);
  emit();
}

export function closeBook() {
  if (!session) {
    // not tracked (should not happen): just drop the hash
    if (parseHash(location.hash)) history.replaceState(null, '', pageUrl());
    emit();
    return;
  }
  finish(history.length - session.baseLen);
}

if (typeof window !== 'undefined') {
  // A shared link (/#book-slug) opened directly: rebuild it as "homepage + book" so closing stays on the site.
  if (parseHash(location.hash)) {
    const url = pageUrl(location.hash);
    history.replaceState(null, '', pageUrl());
    start(url);
  }
  window.addEventListener('popstate', () => {
    if (session) {
      // Back pressed while reading: our top entry was popped → close and skip the flipbook's page entries
      const steps = history.length - session.baseLen - 1;
      finish(steps);
      return;
    }
    if (closing && !parseHash(location.hash)) closing = false;
    // Forward into a book entry: reopen it as a fresh session
    if (!closing && parseHash(location.hash)) {
      const url = pageUrl(location.hash);
      history.replaceState(null, '', pageUrl());
      start(url);
    }
    emit();
  });
}

const snap = () => (closing ? '' : session ? session.url.slice(session.url.indexOf('#')) : '');
let last = '';
export function useViewer(): ViewerState | null {
  const hash = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      const s = snap();
      if (s !== last) last = s;
      return last;
    },
  );
  return parseHash(hash);
}
