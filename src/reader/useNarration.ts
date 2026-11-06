import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AlignedSegment } from '../content/types';
import { findSegmentIndex, findWordIndex } from '../lib/sync';

export interface NarrationOptions {
  /** Resolved audio URL for the current chapter (null = no narration). */
  src: string | null;
  /** Changes whenever the chapter changes (even if src is shared between chapters). */
  chapterKey: string;
  /** Real alignment segments, sorted by begin. Empty = no sync available. */
  segments: AlignedSegment[];
  startAt?: number;
  endAt?: number;
  rate: number;
  onEnded: () => void;
}

export interface Narration {
  audio: HTMLAudioElement | null;
  hasAudio: boolean;
  playing: boolean;
  /** true once the listener has started/sought narration in this chapter — before that nothing is highlighted */
  engaged: boolean;
  error: string | null;
  activeIndex: number;
  activeWord: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (delta: number) => void;
  /** Queue a seek + optional autoplay for when the next chapter's audio is ready. */
  queue: (opts: { time?: number; autoplay?: boolean }) => void;
}

/**
 * One HTMLAudioElement for the whole reader session (survives mode switches).
 * Active sentence/word are derived ONLY from the alignment timestamps and audio.currentTime,
 * sampled every animation frame while playing and on every seek.
 */
export function useNarration(o: NarrationOptions): Narration {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeWord, setActiveWord] = useState(-1);
  const pending = useRef<{ time?: number; autoplay?: boolean }>({});
  const opts = useRef(o);
  opts.current = o;

  // create once
  useEffect(() => {
    const a = new Audio();
    a.preload = 'metadata'; // never preload whole files — load on demand
    audioRef.current = a;
    setAudio(a);
    const onPlay = () => {
      setPlaying(true);
      setEngaged(true);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      opts.current.onEnded();
    };
    const onError = () => {
      if (a.getAttribute('src')) setError('The narration for this chapter could not be loaded.');
    };
    const onTime = () => {
      const end = opts.current.endAt;
      if (end != null && a.currentTime >= end && !a.paused) {
        a.pause();
        opts.current.onEnded();
      }
    };
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    a.addEventListener('error', onError);
    a.addEventListener('timeupdate', onTime);
    return () => {
      a.pause();
      a.removeAttribute('src');
      a.load();
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('error', onError);
      a.removeEventListener('timeupdate', onTime);
    };
  }, []);

  // playback rate
  useEffect(() => {
    if (audio) {
      audio.playbackRate = o.rate;
      audio.defaultPlaybackRate = o.rate;
    }
  }, [audio, o.rate]);

  // chapter / source change
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setEngaged(false);
    setActiveIndex(-1);
    setActiveWord(-1);
    setError(null);
    // read (but only clear once applied — effects may run twice in development StrictMode)
    const { time, autoplay } = pending.current;

    if (!o.src) {
      pending.current = {};
      a.pause();
      if (a.getAttribute('src')) {
        a.removeAttribute('src');
        a.load();
      }
      return;
    }
    const startAt = time ?? opts.current.startAt ?? 0;
    const begin = () => {
      pending.current = {};
      if (startAt) a.currentTime = startAt;
      if (time != null && time > 0) setEngaged(true);
      if (autoplay) a.play().catch(() => setPlaying(false));
    };
    const abs = new URL(o.src, location.href).href;
    if (a.src === abs && a.readyState >= 1) {
      begin();
    } else {
      a.pause();
      a.src = o.src;
      a.playbackRate = opts.current.rate;
      a.addEventListener('loadedmetadata', begin, { once: true });
      a.load();
      return () => a.removeEventListener('loadedmetadata', begin);
    }
  }, [o.src, o.chapterKey]);

  // sync loop
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const segs = o.segments;
    let raf = 0;
    const update = () => {
      const t = a.currentTime;
      const i = findSegmentIndex(segs, t);
      setActiveIndex(i);
      setActiveWord(i >= 0 ? findWordIndex(segs[i], t) : -1);
    };
    const tick = () => {
      update();
      if (!a.paused) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    a.addEventListener('play', start);
    a.addEventListener('seeked', update);
    if (!a.paused) start();
    return () => {
      cancelAnimationFrame(raf);
      a.removeEventListener('play', start);
      a.removeEventListener('seeked', update);
    };
  }, [audio, o.segments]);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => setPlaying(false));
  }, []);
  const pause = useCallback(() => audioRef.current?.pause(), []);
  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.getAttribute('src')) return;
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  }, []);
  const seek = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a) return;
    const lo = opts.current.startAt ?? 0;
    const hi = opts.current.endAt ?? (isFinite(a.duration) ? a.duration : Infinity);
    a.currentTime = Math.max(lo, Math.min(hi, t));
    setEngaged(true);
  }, []);
  const skip = useCallback((d: number) => {
    const a = audioRef.current;
    if (a) seek(a.currentTime + d);
  }, [seek]);
  const queue = useCallback((q: { time?: number; autoplay?: boolean }) => {
    pending.current = q;
  }, []);

  const hasAudio = !!o.src;
  return useMemo(
    () => ({
      audio,
      hasAudio,
      playing,
      engaged,
      error,
      activeIndex: engaged ? activeIndex : -1,
      activeWord: engaged ? activeWord : -1,
      play,
      pause,
      toggle,
      seek,
      skip,
      queue,
    }),
    [audio, hasAudio, playing, engaged, error, activeIndex, activeWord, play, pause, toggle, seek, skip, queue],
  );
}
