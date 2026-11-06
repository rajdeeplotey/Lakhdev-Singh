export interface PageFlipOptions {
  book: HTMLElement;
  leftPage?: string;
  rightPage?: string;
  getIndex: () => number;
  getCount: () => number;
  getSpread: (i: number) => { left: HTMLElement | null; right: HTMLElement | null } | null;
  goTo: (i: number) => void;
  onTogglePlay?: () => void;
  duration?: number;
  threshold?: number;
  flickSpeed?: number;
  startDistance?: number;
}
export interface PageFlip {
  next(): boolean;
  prev(): boolean;
  isTurning(): boolean;
  destroy(): void;
}
export function createPageFlip(opts: PageFlipOptions): PageFlip;
