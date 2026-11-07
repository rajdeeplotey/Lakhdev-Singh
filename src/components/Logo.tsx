import { useState } from 'react';
import { useSite } from '../content/SiteContext';

/**
 * Official logo (public/brand). The artwork uses navy lettering, so it is always presented on a
 * light ground: `badge` wraps the emblem in an ivory medallion for dark surfaces — the artwork
 * itself is never recoloured, cropped or distorted.
 */
export function Logo({
  variant,
  className = '',
  height,
  badge = false,
  eager = false,
}: {
  variant: 'full' | 'stacked' | 'emblem';
  className?: string;
  height?: number;
  badge?: boolean;
  eager?: boolean;
}) {
  const site = useSite();
  const [failed, setFailed] = useState(false);
  const src =
    variant === 'emblem' ? (height && height <= 96 && site?.brand.logoSmall) || site?.brand.logoEmblem : variant === 'stacked' ? site?.brand.logoStacked ?? site?.brand.logoFull : site?.brand.logoFull;
  const alt = variant === 'emblem' ? 'LS — Dr. Lakhdev Singh' : 'Dr. Lakhdev Singh — Writer';

  const img =
    src && !failed ? (
      <img
        src={src}
        alt={badge ? '' : alt}
        className={`logo logo-${variant} ${badge ? '' : className}`}
        style={height && !badge ? { height, width: 'auto' } : undefined}
        onError={() => setFailed(true)}
        decoding="async"
        loading={eager ? 'eager' : undefined}
        draggable={false}
      />
    ) : (
      <span className={`logo-ph logo-ph-${variant === 'emblem' ? 'emblem' : 'full'} ${badge ? '' : className}`} role="img" aria-label={alt}>
        {variant === 'emblem' ? 'LS' : 'Dr. Lakhdev Singh'}
      </span>
    );

  if (!badge) return img;
  return (
    <span className={`emblem-badge ${className}`} style={height ? { width: height, height } : undefined} role="img" aria-label={alt}>
      {img}
    </span>
  );
}
