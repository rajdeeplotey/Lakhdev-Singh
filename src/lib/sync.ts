import type { AlignedSegment } from '../content/types';

/**
 * Given segments sorted by `begin`, return the index of the segment being narrated at time t.
 * During pauses between segments the previous segment stays active, so the highlight never flickers.
 * Returns -1 before the first segment starts.
 */
export function findSegmentIndex(segments: AlignedSegment[], t: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].begin <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** Index of the word being spoken within a segment, or -1. */
export function findWordIndex(seg: AlignedSegment | undefined, t: number): number {
  if (!seg?.words?.length) return -1;
  let ans = -1;
  for (let i = 0; i < seg.words.length; i++) {
    if (seg.words[i][0] <= t) ans = i;
    else break;
  }
  return ans;
}

/** Validates alignment: sorted, non-negative, end ≥ begin, ids exist. Returns problems (empty = valid). */
export function validateSegments(segments: AlignedSegment[], sentenceIds?: Set<string>): string[] {
  const issues: string[] = [];
  segments.forEach((s, i) => {
    if (!(s.begin >= 0) || !(s.end >= s.begin)) issues.push(`segment ${s.id}: invalid times ${s.begin}–${s.end}`);
    if (i > 0 && s.begin < segments[i - 1].begin) issues.push(`segment ${s.id}: not sorted by begin`);
    if (sentenceIds && !sentenceIds.has(s.id)) issues.push(`segment ${s.id}: no matching sentence in chapter text`);
  });
  return issues;
}
