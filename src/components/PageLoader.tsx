import { Logo } from './Logo';

export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading">
      <Logo variant="emblem" className="emblem-pulse" />
    </div>
  );
}
