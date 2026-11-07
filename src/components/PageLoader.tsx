import { Logo } from './Logo';
import { useT } from '../i18n';

export function PageLoader() {
  const t = useT();
  return (
    <div className="page-loader" role="status" aria-label={t.loading}>
      <Logo variant="emblem" className="emblem-pulse" />
    </div>
  );
}
