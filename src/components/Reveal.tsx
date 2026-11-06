import { useEffect, useRef, type ElementType, type ReactNode, type CSSProperties } from 'react';

/** Fades content up once when it scrolls into view. Respects reduced motion via CSS. */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  children,
  style,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add('is-in');
            io.disconnect();
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ ...style, ['--d' as string]: `${delay}s` }}>
      {children}
    </Tag>
  );
}
