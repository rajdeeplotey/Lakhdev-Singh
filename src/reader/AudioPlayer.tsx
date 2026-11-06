import { useEffect, useState } from 'react';
import { useReader, type SleepTimer } from './ReaderContext';
import { fmtTime } from '../lib/format';

const RATES = [0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2];

/** Shared narration controls for both reader modes. Subscribes to the audio element locally. */
export function AudioPlayer({ variant }: { variant: 'compact' | 'full' }) {
  const r = useReader();
  const { narration: n, chapter } = r;
  const a = n.audio;
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [menu, setMenu] = useState<null | 'rate' | 'sleep'>(null);

  useEffect(() => {
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onDur = () => setDur(isFinite(a.duration) ? a.duration : 0);
    const onWait = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('seeked', onTime);
    a.addEventListener('durationchange', onDur);
    a.addEventListener('loadedmetadata', onDur);
    a.addEventListener('waiting', onWait);
    a.addEventListener('playing', onPlaying);
    a.addEventListener('pause', onPlaying);
    onTime();
    onDur();
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('seeked', onTime);
      a.removeEventListener('durationchange', onDur);
      a.removeEventListener('loadedmetadata', onDur);
      a.removeEventListener('waiting', onWait);
      a.removeEventListener('playing', onPlaying);
      a.removeEventListener('pause', onPlaying);
    };
  }, [a]);

  useEffect(() => {
    if (r.sleep.kind !== 'minutes') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [r.sleep]);

  if (!n.hasAudio) {
    return (
      <div className={`player player-${variant} is-empty`}>
        <span className="player-note">Narration for this chapter is not yet available.</span>
      </div>
    );
  }

  const start = chapter.audioStart ?? 0;
  const end = chapter.audioEnd ?? dur;
  const span = Math.max(0, end - start);
  const pos = Math.max(0, Math.min(span, time - start));
  const pct = span ? (pos / span) * 100 : 0;

  const sleepLabel =
    r.sleep.kind === 'off'
      ? 'Sleep'
      : r.sleep.kind === 'chapter'
        ? 'End of ch.'
        : fmtTime(Math.max(0, (r.sleep.until - now) / 1000));

  const setSleep = (s: SleepTimer) => {
    r.setSleep(s);
    setMenu(null);
  };

  return (
    <div className={`player player-${variant}`} role="region" aria-label="Narration player">
      <div className="player-scrub">
        <span className="player-time">{fmtTime(pos)}</span>
        <input
          type="range"
          className="scrub"
          min={0}
          max={span || 0}
          step={0.1}
          value={pos}
          onChange={(e) => {
            n.seek(start + Number(e.target.value));
            r.setFollow(true);
          }}
          aria-label="Seek narration"
          aria-valuetext={`${fmtTime(pos)} of ${fmtTime(span)}`}
          style={{ ['--pct' as string]: `${pct}%` }}
        />
        <span className="player-time">{fmtTime(span)}</span>
      </div>

      <div className="player-controls">
        <div className="player-side">
          <div className="menu-wrap">
            <button
              className="chip"
              onClick={() => setMenu(menu === 'rate' ? null : 'rate')}
              aria-haspopup="menu"
              aria-expanded={menu === 'rate'}
              aria-label={`Playback speed ${r.prefs.rate}×`}
            >
              {r.prefs.rate}×
            </button>
            {menu === 'rate' && (
              <div className="menu" role="menu">
                {RATES.map((v) => (
                  <button
                    key={v}
                    role="menuitemradio"
                    aria-checked={r.prefs.rate === v}
                    className={r.prefs.rate === v ? 'is-on' : ''}
                    onClick={() => {
                      r.setPrefs({ rate: v });
                      setMenu(null);
                    }}
                  >
                    {v}×
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="player-main">
          <button className="ctl" onClick={() => n.skip(-10)} aria-label="Rewind 10 seconds">
            <SkipIcon back />
          </button>
          <button
            className={`ctl ctl-play ${buffering && n.playing ? 'is-buffering' : ''}`}
            onClick={() => {
              r.setFollow(true);
              n.toggle();
            }}
            aria-label={n.playing ? 'Pause narration' : 'Play narration'}
          >
            {n.playing ? (
              <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden>
                <rect x="1" width="4.5" height="18" fill="currentColor" />
                <rect x="10.5" width="4.5" height="18" fill="currentColor" />
              </svg>
            ) : (
              <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden>
                <path d="M2 0 L16 9 L2 18 Z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button className="ctl" onClick={() => n.skip(10)} aria-label="Forward 10 seconds">
            <SkipIcon />
          </button>
        </div>

        <div className="player-side player-side-r">
          <div className="menu-wrap">
            <button
              className={`chip ${r.sleep.kind !== 'off' ? 'is-on' : ''}`}
              onClick={() => setMenu(menu === 'sleep' ? null : 'sleep')}
              aria-haspopup="menu"
              aria-expanded={menu === 'sleep'}
              aria-label="Sleep timer"
            >
              <MoonIcon /> <span className="chip-label">{sleepLabel}</span>
            </button>
            {menu === 'sleep' && (
              <div className="menu menu-r" role="menu">
                {[10, 20, 30, 45, 60].map((m) => (
                  <button key={m} role="menuitem" onClick={() => setSleep({ kind: 'minutes', until: Date.now() + m * 60000 })}>
                    {m} minutes
                  </button>
                ))}
                <button role="menuitem" onClick={() => setSleep({ kind: 'chapter' })}>
                  End of chapter
                </button>
                {r.sleep.kind !== 'off' && (
                  <button role="menuitem" onClick={() => setSleep({ kind: 'off' })}>
                    Turn off
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {n.error && <p className="player-note is-error">{n.error}</p>}
    </div>
  );
}

function SkipIcon({ back = false }: { back?: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <g transform={back ? undefined : 'translate(26 0) scale(-1 1)'}>
        <path d="M6.5 8.5 A 8.5 8.5 0 1 1 4.6 15" strokeLinecap="round" />
        <path d="M6.8 3.6 L6.5 8.5 L11.3 8.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="13" y="16.4" textAnchor="middle" fontSize="7.4" fill="currentColor" stroke="none" fontFamily="Manrope, sans-serif" fontWeight="600">
        10
      </text>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M8.5 9.6A5 5 0 0 1 4.6 1a5 5 0 1 0 6.4 6.4 5 5 0 0 1-2.5 2.2z" fill="currentColor" />
    </svg>
  );
}
