/**
 * page-flip.js  (v2 — replaces page-turn-controls.js)
 *
 * Drag-to-turn (mouse / touch / pen) + keyboard page turning for a two-page book spread.
 *
 * Why v2: the page text itself is NEVER moved. While a page turns, a temporary
 * "flip layer" is drawn on top of the book (copies of the pages + a 3D leaf with a
 * front and a back). When the turn ends, your reader switches to the new spread and
 * the layer is removed completely, so no tilt, skew or shadow can be left behind.
 *
 * Usage:
 *   import { createPageFlip } from './page-flip.js';
 *
 *   const flip = createPageFlip({
 *     book: document.querySelector('.book-spread'),   // element that holds both pages
 *     leftPage: '.page-left',                          // selector of the left page inside it
 *     rightPage: '.page-right',                        // selector of the right page inside it
 *     getIndex: () => reader.spreadIndex,              // current spread (0-based)
 *     getCount: () => reader.spreadCount,              // number of spreads in the chapter
 *     getSpread: (i) => reader.renderSpread(i),        // -> { left: HTMLElement|null, right: HTMLElement|null }
 *     goTo: (i) => reader.showSpread(i),               // switch the real reader to spread i
 *     onTogglePlay: () => player.toggle(),             // optional, Space key
 *   });
 *
 *   // Arrow buttons and narration auto-turn should call flip.next() / flip.prev()
 *   // instead of changing the page directly, so they get the same animation.
 *   // React: create in useEffect, return () => flip.destroy().
 *
 * getSpread(i) must return NEW, fully rendered page elements for spread i, looking
 * exactly like the real pages (same classes, fonts, padding, running header, page
 * number). Return null for a page that does not exist. See the build prompt.
 *
 * LOCAL CHANGE (marked "FIX" below): on touch screens the browser implicitly captures the
 * pointer to the touched child (a word/sentence span). book.setPointerCapture() moves the
 * capture, which fires a *bubbling* lostpointercapture from that child — the original handler
 * treated it as a cancel and aborted every swipe. Only the book's own capture loss cancels now.
 */

export function createPageFlip(opts) {
  const {
    book,
    leftPage = '.page-left',
    rightPage = '.page-right',
    getIndex,
    getCount,
    getSpread,
    goTo,
    onTogglePlay,
    duration = 650,       // ms for a full automatic turn
    threshold = 0.28,     // release past 28% of the turn = complete it
    flickSpeed = 0.55,    // px/ms — a fast flick also completes the turn
    startDistance = 8,    // px before a press becomes a drag
  } = opts;

  if (!book) throw new Error('createPageFlip: "book" element is required');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let flip = null;        // the active turn (layer + state)
  let press = null;       // pointer press that may become a drag
  let busy = false;       // true while a turn animates
  // LOCAL CHANGE: turns requested while another turn is animating (fast key presses / clicks)
  // are queued instead of dropped, and play back quickly.
  const queue = [];
  const MAX_QUEUE = 4;
  const HURRY = 2.6;      // animation speed-up while more turns are waiting

  // ---------------------------------------------------------------- helpers
  const canGo = (dir) => {
    const i = getIndex();
    return dir === 'next' ? i < getCount() - 1 : i > 0;
  };

  const live = document.createElement('div');
  live.className = 'pf-live';
  live.setAttribute('aria-live', 'polite');
  book.appendChild(live);
  const announce = (t) => { live.textContent = ''; setTimeout(() => (live.textContent = t), 30); };

  book.classList.add('pf-ready');
  if (!book.hasAttribute('tabindex')) book.setAttribute('tabindex', '0');
  book.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight PageUp PageDown Space');

  function rectIn(el) {
    const b = book.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { left: r.left - b.left, top: r.top - b.top, width: r.width, height: r.height };
  }

  function copyOf(el) {
    if (!el) return null;
    const c = el.cloneNode(true);
    c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    c.removeAttribute('id');
    return c;
  }

  // Put a page element into an absolutely-positioned slot.
  function slot(className, rect, content) {
    const s = document.createElement('div');
    s.className = 'pf-slot ' + className;
    Object.assign(s.style, {
      left: rect.left + 'px', top: rect.top + 'px',
      width: rect.width + 'px', height: rect.height + 'px',
    });
    if (content) {
      content.classList.add('pf-page');
      content.style.width = rect.width + 'px';
      content.style.height = rect.height + 'px';
      s.appendChild(content);
    } else {
      s.classList.add('pf-blank');
    }
    return s;
  }

  // ---------------------------------------------------------- build the layer
  function begin(dir) {
    if (busy || flip || !canGo(dir)) return null;
    const L = book.querySelector(leftPage);
    const R = book.querySelector(rightPage);
    if (!L || !R) return null;

    const rl = rectIn(L), rr = rectIn(R);
    const from = getIndex();
    const to = dir === 'next' ? from + 1 : from - 1;
    const dest = getSpread(to) || {};

    const layer = document.createElement('div');
    layer.className = 'pf-layer';
    layer.setAttribute('aria-hidden', 'true');

    let under, still, leaf, front, back, frontShade, backShade, underShade;
    if (dir === 'next') {
      still = slot('pf-still', rl, copyOf(L));                 // current left page stays
      under = slot('pf-under', rr, dest.right || null);        // revealed: next right page
      leaf = document.createElement('div');                    // turning: current right page
      leaf.className = 'pf-leaf pf-leaf-next';
      Object.assign(leaf.style, { left: rr.left + 'px', top: rr.top + 'px', width: rr.width + 'px', height: rr.height + 'px' });
      front = slot('pf-face pf-front', { left: 0, top: 0, width: rr.width, height: rr.height }, copyOf(R));
      back = slot('pf-face pf-back', { left: 0, top: 0, width: rl.width, height: rl.height }, dest.left || null);
      back.style.left = (rr.width - rl.width) + 'px';
    } else {
      still = slot('pf-still', rr, copyOf(R));                 // current right page stays
      under = slot('pf-under', rl, dest.left || null);         // revealed: previous left page
      leaf = document.createElement('div');                    // turning: current left page
      leaf.className = 'pf-leaf pf-leaf-prev';
      Object.assign(leaf.style, { left: rl.left + 'px', top: rl.top + 'px', width: rl.width + 'px', height: rl.height + 'px' });
      front = slot('pf-face pf-front', { left: 0, top: 0, width: rl.width, height: rl.height }, copyOf(L));
      back = slot('pf-face pf-back', { left: 0, top: 0, width: rr.width, height: rr.height }, dest.right || null);
    }

    frontShade = document.createElement('div'); frontShade.className = 'pf-shade';
    backShade = document.createElement('div'); backShade.className = 'pf-shade';
    underShade = document.createElement('div'); underShade.className = 'pf-shade pf-under-shade';
    front.appendChild(frontShade);
    back.appendChild(backShade);
    under.appendChild(underShade);
    leaf.append(front, back);
    layer.append(under, still, leaf);
    book.appendChild(layer);
    book.classList.add('pf-turning');

    flip = { dir, from, to, layer, leaf, frontShade, backShade, underShade, progress: 0 };
    render(0);
    return flip;
  }

  // progress 0 = flat, 1 = fully turned
  function render(p) {
    if (!flip) return;
    flip.progress = p;
    const angle = p * 180 * (flip.dir === 'next' ? -1 : 1);
    flip.leaf.style.transform = `rotateY(${angle}deg)`;
    const fold = Math.sin(p * Math.PI);                         // 0 → 1 → 0
    flip.frontShade.style.opacity = (Math.min(1, p * 2) * 0.35).toFixed(3);
    flip.backShade.style.opacity = (Math.min(1, (1 - p) * 2) * 0.35).toFixed(3);
    flip.underShade.style.opacity = ((1 - p) * 0.25).toFixed(3);
    flip.leaf.style.setProperty('--pf-fold', fold.toFixed(3));
  }

  function finish(complete) {
    const f = flip;
    if (!f) return;
    if (complete) {
      goTo(f.to);
      announce(f.dir === 'next' ? 'Next page' : 'Previous page');
    }
    // Remove the layer only after the real reader has painted the new spread,
    // so there is no flash of the old pages.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      f.layer.remove();
      book.classList.remove('pf-turning');
      if (flip === f) flip = null;
      busy = false;
      // play the next queued turn (if it is still possible)
      while (queue.length) {
        const dir = queue.shift();
        if (canGo(dir)) { startTurn(dir); break; }
        nudge(dir);
      }
    }));
  }

  function animateTo(target, complete) {
    const f = flip;
    if (!f) return;
    busy = true;
    if (reduceMotion) { render(target); finish(complete); return; }
    const start = f.progress;
    const span = Math.abs(target - start);
    const time = Math.max(140, duration * span);
    let last = performance.now();
    let elapsed = 0;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function step(now) {
      if (flip !== f) return;
      // runs faster while further turns are queued, so rapid presses never lag behind
      elapsed += (now - last) * (queue.length ? HURRY : 1);
      last = now;
      const t = Math.min(1, elapsed / time);
      render(start + (target - start) * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else finish(complete);
    }
    requestAnimationFrame(step);
  }

  function nudge(dir) {
    if (reduceMotion) return;
    book.classList.remove('pf-bump-next', 'pf-bump-prev');
    void book.offsetWidth;
    book.classList.add(dir === 'next' ? 'pf-bump-next' : 'pf-bump-prev');
  }

  function startTurn(dir) {
    if (!begin(dir)) return false;
    animateTo(1, true);
    return true;
  }

  // Public: animated turn (buttons, keys, narration auto-turn).
  function turn(dir) {
    if (press && press.dragging) return false;          // a drag is in progress
    if (busy || flip) {
      // a turn is animating: remember this one (an opposite press cancels a queued one)
      const lastQueued = queue[queue.length - 1];
      if (lastQueued && lastQueued !== dir) queue.pop();
      else if (queue.length < MAX_QUEUE) queue.push(dir);
      return true;
    }
    if (!canGo(dir)) { nudge(dir); return false; }
    return startTurn(dir);
  }

  // ---------------------------------------------------------- pointer drag
  const isControl = (t) =>
    t.closest('a, button, input, select, textarea, label, [contenteditable="true"], [data-no-drag]');

  function onDown(e) {
    if (e.button !== 0 || busy || flip || isControl(e.target)) return;
    press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), lastX: e.clientX, lastT: performance.now(), dragging: false, blocked: false };
  }

  function onMove(e) {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x0;
    const dy = e.clientY - press.y0;

    if (!press.dragging) {
      if (Math.abs(dx) < startDistance && Math.abs(dy) < startDistance) return;
      if (Math.abs(dy) > Math.abs(dx)) { press = null; return; }   // vertical = text selection
      const dir = dx < 0 ? 'next' : 'prev';
      window.getSelection()?.removeAllRanges();
      book.setPointerCapture(press.id);
      book.classList.add('pf-dragging');
      press.dragging = true;
      press.dir = dir;
      if (!begin(dir)) { press.blocked = true; nudge(dir); return; }
    }
    e.preventDefault();
    if (press.blocked || !flip) return;

    const pageWidth = book.clientWidth / 2 || 1;
    const pulled = press.dir === 'next' ? -dx : dx;              // distance in turn direction
    const p = Math.max(0, Math.min(1, pulled / (pageWidth * 1.6)));
    render(p);
    press.lastX = e.clientX; press.lastT = performance.now();
  }

  function onUp(e) {
    if (!press || e.pointerId !== press.id) return;
    const pr = press; press = null;
    book.classList.remove('pf-dragging');
    if (!pr.dragging || pr.blocked || !flip) return;
    const elapsed = Math.max(1, performance.now() - pr.t0);
    const dx = e.clientX - pr.x0;
    const pulled = pr.dir === 'next' ? -dx : dx;
    const fast = pulled > 30 && pulled / elapsed > flickSpeed;
    if (flip.progress > threshold || fast) animateTo(1, true);
    else animateTo(0, false);
  }

  function onCancel(e) {
    // FIX: ignore lostpointercapture bubbling up from a child (touch implicit capture moving to book)
    if (e && e.type === 'lostpointercapture' && e.target !== book) return;
    const pr = press; press = null;
    book.classList.remove('pf-dragging');
    if (pr && pr.dragging && flip && !busy) animateTo(0, false);
  }

  const noNativeDrag = (e) => e.preventDefault();

  // ---------------------------------------------------------- keyboard
  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t.closest && t.closest('input, select, textarea, [contenteditable="true"], [role="slider"], [role="dialog"]')) return;
    // holding a key down: keep at most one turn waiting, so pages stop as soon as the key is released
    const turnKey = ['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key);
    if (turnKey && e.repeat && (busy || flip) && queue.length) { e.preventDefault(); return; }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); turn('next'); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); turn('prev'); }
    else if (e.key === ' ' && onTogglePlay && !(t.closest && t.closest('button, a'))) { e.preventDefault(); onTogglePlay(); }
  }

  book.addEventListener('pointerdown', onDown);
  book.addEventListener('pointermove', onMove);
  book.addEventListener('pointerup', onUp);
  book.addEventListener('pointercancel', onCancel);
  book.addEventListener('lostpointercapture', onCancel);
  book.addEventListener('dragstart', noNativeDrag);
  window.addEventListener('keydown', onKey);

  return {
    next: () => turn('next'),
    prev: () => turn('prev'),
    isTurning: () => busy || !!flip,
    destroy() {
      book.removeEventListener('pointerdown', onDown);
      book.removeEventListener('pointermove', onMove);
      book.removeEventListener('pointerup', onUp);
      book.removeEventListener('pointercancel', onCancel);
      book.removeEventListener('lostpointercapture', onCancel);
      book.removeEventListener('dragstart', noNativeDrag);
      window.removeEventListener('keydown', onKey);
      flip?.layer.remove();
      flip = null; press = null; busy = false;
      queue.length = 0;
      live.remove();
      book.classList.remove('pf-ready', 'pf-dragging', 'pf-turning');
    },
  };
}
