/**
 * Where Heyzine draws a page inside its frame. Heyzine is another website (cross-origin), so nothing inside its frame
 * can be read; instead its layout was measured with the flipbook opened directly at 60+ frame sizes
 * (work/heyzine-calibration.json) and is reproduced here. It depends only on the frame size and the page number.
 *
 * Measured rules:
 *  - book area ("magazine viewport"): frame width ≤ 750 → 10 px around (bottom 34);  751–789 → 42 px left/right,
 *    10 top, 34 bottom;  ≥ 790 → 52 px left/right, 20 top, 44 bottom.
 *  - two pages side by side when the book area is ≥ 750 px wide or wider than it is tall; otherwise one page.
 *  - a page is as large as fits (page shape = the book's pages), centred; two-page mode: page 1 alone in the middle,
 *    then even pages left and odd pages right of the centre line.
 *  - one-page mode rounds the page width down to an even number of pixels, two-page mode to a whole pixel.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** page width ÷ page height as Heyzine shows it (Part 1, measured: 0.70732–0.7074) */
export const PART1_PAGE_RATIO = 0.70736;

export function heyzineViewport(frameW: number, frameH: number): Rect {
  if (frameW <= 750) return { x: 10, y: 10, w: frameW - 20, h: frameH - 44 };
  if (frameW < 790) return { x: 42, y: 10, w: frameW - 84, h: frameH - 44 };
  return { x: 52, y: 20, w: frameW - 104, h: frameH - 64 };
}

export function heyzineIsDouble(frameW: number, frameH: number): boolean {
  const vp = heyzineViewport(frameW, frameH);
  return vp.w >= 750 || vp.w > vp.h;
}

/** The rectangle of `page` (1-based Heyzine page = PDF page) inside a Heyzine frame of the given size, in CSS px. */
export function heyzinePageRect(frameW: number, frameH: number, page: number, ratio = PART1_PAGE_RATIO): Rect {
  const vp = heyzineViewport(frameW, frameH);
  const double = heyzineIsDouble(frameW, frameH);
  const w = double ? Math.floor(Math.min(vp.w / 2, vp.h * ratio)) : Math.floor(Math.min(vp.w, vp.h * ratio) / 2) * 2;
  const h = w / ratio;
  const y = vp.y + (vp.h - h) / 2;
  const mid = vp.x + vp.w / 2;
  if (!double || page === 1) return { x: vp.x + (vp.w - w) / 2, y, w, h };
  return page % 2 === 0 ? { x: mid - w, y, w, h } : { x: mid, y, w, h };
}

/** The page(s) visible when Heyzine shows `page`: [page] in one-page mode, the spread [even, odd] in two-page mode. */
export function heyzineVisiblePages(frameW: number, frameH: number, page: number, pageCount: number): number[] {
  if (!heyzineIsDouble(frameW, frameH) || page === 1) return [page];
  const left = page % 2 === 0 ? page : page - 1;
  return left + 1 <= pageCount ? [left, left + 1] : [left];
}
