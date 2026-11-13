import { useEffect, useState } from 'react';
import { CHARACTER_PALETTES, CharacterSprite, type CharacterPose, type SpriteId } from './CharacterSprite.js';

interface Props {
  character: SpriteId;
  size?: number;
  pose?: CharacterPose;
  variant?: 'card' | 'avatar';
  className?: string;
}

/**
 * Displays painted 1899 Western character portrait artwork using fast compressed WebP
 * thumbnails with seamless fallback to original JPEG or vector CharacterSprite.
 */
export function CharacterPortrait({
  character,
  size = 56,
  pose = 'idle',
  variant = 'avatar',
  className = '',
}: Props) {
  const [srcStage, setSrcStage] = useState<'webp' | 'jpg' | 'svg'>('webp');
  const pal = CHARACTER_PALETTES[character];

  useEffect(() => {
    setSrcStage('webp');
  }, [character]);

  if (srcStage === 'svg') {
    return <CharacterSprite character={character} size={size} pose={pose} className={className} />;
  }

  const src =
    srcStage === 'webp' ? `/art/thumbs/portrait-${character}.webp` : `/art/portrait-${character}.jpg`;

  return (
    <img
      src={src}
      alt={pal.label}
      className={`char-portrait-img is-${variant} ${className}`}
      width={variant === 'card' ? undefined : size}
      height={variant === 'card' ? undefined : size}
      style={variant === 'avatar' ? { width: size, height: size, borderColor: pal.accent } : undefined}
      loading="eager"
      decoding="async"
      draggable={false}
      onError={() => setSrcStage((prev) => (prev === 'webp' ? 'jpg' : 'svg'))}
    />
  );
}
