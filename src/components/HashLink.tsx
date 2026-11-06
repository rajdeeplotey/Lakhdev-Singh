import type { ReactNode, CSSProperties, MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';

/** In-app link to a homepage section ("/#books") that works from any route without a full reload. */
export function HashLink({
  to,
  children,
  className,
  style,
  onClick,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const { pathname } = useLocation();
  const [path, hash] = to.split('#');
  const handle = (e: MouseEvent) => {
    onClick?.();
    if ((path || '/') === pathname && hash) {
      e.preventDefault();
      scrollToId(hash);
      history.replaceState(null, '', `#${hash}`);
    }
  };
  return (
    <Link to={to} className={className} style={style} onClick={handle}>
      {children}
    </Link>
  );
}

export function scrollToId(id: string) {
  if (id === 'top') return window.scrollTo({ top: 0, behavior: 'smooth' });
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
