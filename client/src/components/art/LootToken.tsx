import { useId } from 'react';
import type { LootType } from '@colt/shared';

interface LootTokenProps {
  type: LootType;
  value?: number | null;
  size?: number;
  title?: string;
}

/** Original SVG loot tokens with instance-scoped gradient IDs: burlap purse, faceted ruby jewel, steel strongbox. */
export function LootToken({ type, value = null, size = 34, title }: LootTokenProps) {
  const uid = useId().replace(/:/g, '');

  if (type === 'purse') {
    const gradId = `burlap-${uid}`;
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" className="loot-svg" role="img" aria-label={title ?? 'Money Bag'}>
        <title>{title ?? (value !== null ? `Purse ($${value})` : 'Purse (Hidden)')}</title>
        <defs>
          <radialGradient id={gradId} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#edd19c" />
            <stop offset="65%" stopColor="#b8884d" />
            <stop offset="100%" stopColor="#7a5328" />
          </radialGradient>
        </defs>
        <path d="M13,6 L18,12 L22,12 L27,6 Q20,10 13,6 Z" fill="#d9ad6d" stroke="#473018" strokeWidth="1.4" />
        <path
          d="M14,13 C7,19 7,35 20,36 C33,35 33,19 26,13 Z"
          fill={`url(#${gradId})`}
          stroke="#3d2610"
          strokeWidth="1.6"
        />
        <rect x="13.5" y="11" width="13" height="3.4" rx="1.5" fill="#824c20" stroke="#361f0b" strokeWidth="1" />
        <circle cx="20" cy="24.5" r="7.5" fill="rgba(255, 224, 145, 0.28)" stroke="#704a20" strokeWidth="0.7" />
        <text x="20" y="28" textAnchor="middle" fontSize={value !== null ? '8.5' : '13'} fontWeight="900" fill="#2e1b08">
          {value !== null ? `$${value}` : '$'}
        </text>
      </svg>
    );
  }

  if (type === 'jewel') {
    const gradId = `ruby-${uid}`;
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" className="loot-svg" role="img" aria-label={title ?? 'Ruby Jewel ($500)'}>
        <title>{title ?? 'Jewel ($500)'}</title>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9cae" />
            <stop offset="45%" stopColor="#e32245" />
            <stop offset="100%" stopColor="#660718" />
          </linearGradient>
        </defs>
        <polygon points="12,8 28,8 35,17 20,35 5,17" fill={`url(#${gradId})`} stroke="#3d0510" strokeWidth="1.6" />
        <polygon points="12,8 28,8 24,17 16,17" fill="#ffb3c0" opacity="0.72" />
        <polygon points="16,17 24,17 20,35" fill="#b8102e" opacity="0.82" />
        <line x1="5" y1="17" x2="35" y2="17" stroke="#ffd9e0" strokeWidth="1" opacity="0.75" />
        <circle cx="15" cy="12" r="1.4" fill="#fff" opacity="0.9" />
      </svg>
    );
  }

  const vaultId = `vault-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="loot-svg" role="img" aria-label={title ?? 'Strongbox ($1,000)'}>
      <title>{title ?? 'Strongbox ($1,000)'}</title>
      <defs>
        <linearGradient id={vaultId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3f7356" />
          <stop offset="100%" stopColor="#1e3c2c" />
        </linearGradient>
      </defs>
      <path d="M14,10 L14,6 L26,6 L26,10" fill="none" stroke="#dcb052" strokeWidth="2.8" strokeLinecap="round" />
      <rect x="5" y="10" width="30" height="24" rx="3" fill={`url(#${vaultId})`} stroke="#122219" strokeWidth="1.7" />
      <rect x="5" y="10" width="30" height="6" rx="2" fill="#467d5f" stroke="#122219" strokeWidth="1.2" />
      <rect x="16.5" y="13.5" width="7" height="6.5" rx="1.2" fill="#f0c158" stroke="#523c10" strokeWidth="1" />
      <circle cx="20" cy="16.8" r="1.1" fill="#3a2808" />
      <circle cx="9" cy="13" r="1.2" fill="#f0c158" />
      <circle cx="31" cy="13" r="1.2" fill="#f0c158" />
      <circle cx="9" cy="30" r="1.2" fill="#f0c158" />
      <circle cx="31" cy="30" r="1.2" fill="#f0c158" />
      <text x="20" y="30" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fce7b2">
        $1K
      </text>
    </svg>
  );
}

export function BulletToken({ isNeutral = false, number = 6, size = 24 }: { isNeutral?: boolean; number?: number; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `brass-${uid}-${isNeutral ? 'n' : 'b'}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={isNeutral ? 'Neutral Bullet' : `Bullet #${number}`}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={isNeutral ? '#9aa3b0' : '#ebd07e'} />
          <stop offset="55%" stopColor={isNeutral ? '#727a87' : '#c99034'} />
          <stop offset="100%" stopColor={isNeutral ? '#4d535e' : '#8a5d17'} />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="12" height="17" rx="1.5" fill={`url(#${gradId})`} stroke="#21180d" strokeWidth="1.3" />
      <path d="M10,10 Q16,1 22,10 Z" fill={isNeutral ? '#b8c0ce' : '#de753b'} stroke="#21180d" strokeWidth="1.3" />
      <rect x="8" y="26" width="16" height="3" rx="1" fill="#523f2a" />
      <text x="16" y="22" textAnchor="middle" fontSize="8" fontWeight="900" fill="#18120c">
        {isNeutral ? '★' : number}
      </text>
    </svg>
  );
}

export function MarshalBadge({ size = 28 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `goldstar-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" role="img" aria-label="Marshal Badge">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe48f" />
          <stop offset="55%" stopColor="#ebb844" />
          <stop offset="100%" stopColor="#9c6c18" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="15.2" fill="rgba(45, 29, 12, 0.45)" stroke="#ecc058" strokeWidth="2" />
      <polygon
        points="18,4 21,12 30,12 23,18 26,27 18,22 10,27 13,18 6,12 15,12"
        fill={`url(#${gradId})`}
        stroke="#4f380b"
        strokeWidth="1.4"
      />
      <circle cx="18" cy="16.5" r="3" fill="#4f380b" />
    </svg>
  );
}
