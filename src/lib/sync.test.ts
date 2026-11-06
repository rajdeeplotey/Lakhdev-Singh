import { describe, expect, it } from 'vitest';
import { findSegmentIndex, findWordIndex, validateSegments } from './sync';

const segs = [
  { id: 's1', begin: 0.5, end: 2, words: [[0.5, 1], [1.1, 2]] as [number, number][] },
  { id: 's2', begin: 2.4, end: 4 },
  { id: 's3', begin: 4.1, end: 7 },
];

describe('findSegmentIndex', () => {
  it('returns -1 before narration starts', () => expect(findSegmentIndex(segs, 0.1)).toBe(-1));
  it('finds the segment containing t', () => {
    expect(findSegmentIndex(segs, 0.5)).toBe(0);
    expect(findSegmentIndex(segs, 3)).toBe(1);
    expect(findSegmentIndex(segs, 6.9)).toBe(2);
  });
  it('keeps the previous segment during a pause', () => expect(findSegmentIndex(segs, 2.2)).toBe(0));
  it('stays on the last segment after the end', () => expect(findSegmentIndex(segs, 99)).toBe(2));
  it('handles empty input', () => expect(findSegmentIndex([], 1)).toBe(-1));
});

describe('findWordIndex', () => {
  it('finds the spoken word', () => {
    expect(findWordIndex(segs[0], 0.7)).toBe(0);
    expect(findWordIndex(segs[0], 1.5)).toBe(1);
    expect(findWordIndex(segs[1], 3)).toBe(-1);
  });
});

describe('validateSegments', () => {
  it('accepts valid data', () => expect(validateSegments(segs, new Set(['s1', 's2', 's3']))).toEqual([]));
  it('flags unknown ids, bad times and unsorted input', () => {
    const bad = [
      { id: 'x', begin: 3, end: 4 },
      { id: 's1', begin: 1, end: 0.5 },
    ];
    expect(validateSegments(bad, new Set(['s1'])).length).toBe(3);
  });
});
