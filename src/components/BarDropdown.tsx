import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface BarOption {
  value: number;
  label: ReactNode;
}

/**
 * Dropdown for the audio bar. The bar sits at the bottom of the screen, and a native <select> decides for itself
 * whether to open up or down (short lists opened downward and were cut off). This one always opens UPWARD.
 * Button + listbox: pick / tap outside / Escape closes it; ↑ ↓ Home End move, Enter or Space picks.
 */
export function BarDropdown({
  label,
  options,
  value,
  onChange,
  face,
  align = 'left',
  className = '',
  lang,
}: {
  label: string; // accessible name, e.g. "Chapter"
  options: BarOption[];
  value: number;
  onChange: (v: number) => void;
  face: ReactNode; // what the closed button shows
  align?: 'left' | 'right'; // which edge of the button the list lines up with
  className?: string;
  lang?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = Math.max(0, options.findIndex((o) => o.value === value));

  const show = (at = current) => {
    setActive(at);
    setOpen(true);
  };
  const close = (focusButton: boolean) => {
    setOpen(false);
    if (focusButton) btn.current?.focus();
  };
  const pick = (i: number) => {
    close(true);
    if (options[i] && options[i].value !== value) onChange(options[i].value);
  };

  // while open: focus the list, and close on a tap/click anywhere else
  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    // a tap on the book goes into Heyzine's frame and never reaches this page; it does take the focus away from it
    const onBlur = () => setOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [open]);
  // keep the highlighted item in view (long chapter lists scroll inside the popup)
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  // keys are handled here and not passed on (the book viewer uses arrows for page turns, Space for play, Esc to close)
  const onButtonKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      show();
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        setActive((a) => Math.min(last, a + 1));
        break;
      case 'ArrowUp':
        setActive((a) => Math.max(0, a - 1));
        break;
      case 'Home':
        setActive(0);
        break;
      case 'End':
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        pick(active);
        break;
      case 'Escape':
        close(true);
        break;
      case 'Tab':
        close(false);
        return;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div ref={root} className={`bar-dd ${className}`}>
      <span id={`${id}-l`} className="sr-only">
        {label}
      </span>
      <button
        ref={btn}
        id={`${id}-b`}
        type="button"
        className="bar-dd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-l ${id}-b`}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={onButtonKey}
        lang={lang}
      >
        <span className="bar-dd-face">{face}</span>
      </button>
      {open && (
        <ul
          ref={list}
          className={`bar-dd-list bar-dd-${align}`}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-l`}
          aria-activedescendant={`${id}-o${active}`}
          onKeyDown={onListKey}
          lang={lang}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-o${i}`}
              data-i={i}
              role="option"
              aria-selected={i === current}
              className={`${i === current ? 'is-current' : ''} ${i === active ? 'is-active' : ''}`}
              onClick={() => pick(i)}
              onMouseMove={() => active !== i && setActive(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
