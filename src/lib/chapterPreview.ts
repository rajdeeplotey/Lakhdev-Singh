import { useSyncExternalStore } from 'react';

/**
 * One shared audio element for homepage playback (hero "Chapter 1" controls, author welcome).
 * Only one recording plays at a time; each control asks whether *its* source is the one playing.
 * Created on first play — nothing preloads.
 */
let audio: HTMLAudioElement | null = null;
let state = { src: null as string | null, playing: false, time: 0, duration: 0 };
const subs = new Set<() => void>();
const update = (p: Partial<typeof state>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};

export function togglePreview(src: string, startAt = 0) {
  if (!audio || state.src !== src) {
    audio?.pause();
    const a = new Audio(src);
    a.preload = 'none';
    a.addEventListener('play', () => audio === a && update({ playing: true }));
    a.addEventListener('pause', () => audio === a && update({ playing: false }));
    a.addEventListener('ended', () => audio === a && update({ playing: false, time: 0 }));
    a.addEventListener('timeupdate', () => audio === a && update({ time: a.currentTime }));
    a.addEventListener('loadedmetadata', () => audio === a && update({ duration: isFinite(a.duration) ? a.duration : 0 }));
    if (startAt) a.currentTime = startAt;
    audio = a;
    update({ src, playing: false, time: startAt, duration: 0 });
  }
  if (audio.paused) audio.play().catch(() => update({ playing: false }));
  else audio.pause();
}

export function stopPreview() {
  audio?.pause();
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};

/** true while `src` is the recording currently playing */
export function usePreviewPlaying(src: string | null) {
  return useSyncExternalStore(subscribe, () => !!src && state.src === src && state.playing);
}

/** elapsed seconds of `src` (0 if another recording is loaded) */
export function usePreviewTime(src: string | null) {
  return useSyncExternalStore(subscribe, () => (src && state.src === src ? Math.floor(state.time) : 0));
}
