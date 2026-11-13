import type { CharacterId } from '@colt/shared';

export type SpriteId = CharacterId | 'marshal';
export type CharacterPose = 'idle' | 'move' | 'climb' | 'shoot' | 'punch' | 'hit' | 'rob';

export interface CharacterPalette {
  primary: string;
  secondary: string;
  highlight: string;
  accent: string;
  skin: string;
  skinShadow: string;
  hat: string;
  hatHighlight: string;
  label: string;
}

export const CHARACTER_PALETTES: Record<SpriteId, CharacterPalette> = {
  django: {
    primary: '#262b34',
    secondary: '#454c59',
    highlight: '#687182',
    accent: '#dfa046',
    skin: '#dca884',
    skinShadow: '#b9825d',
    hat: '#181a20',
    hatHighlight: '#3b404c',
    label: 'Django',
  },
  tuco: {
    primary: '#ba3a22',
    secondary: '#7d2212',
    highlight: '#de5b3f',
    accent: '#f0bd4f',
    skin: '#cd9267',
    skinShadow: '#a66b43',
    hat: '#cfa25b',
    hatHighlight: '#edd093',
    label: 'Tuco',
  },
  doc: {
    primary: '#224f7c',
    secondary: '#376fa3',
    highlight: '#5d98cc',
    accent: '#edd06d',
    skin: '#ebc2a7',
    skinShadow: '#c79779',
    hat: '#1b2634',
    hatHighlight: '#3d4f68',
    label: 'Doc',
  },
  cheyenne: {
    primary: '#2c7248',
    secondary: '#9e693b',
    highlight: '#499d6a',
    accent: '#48ccc0',
    skin: '#c98b62',
    skinShadow: '#9e6440',
    hat: '#472f1c',
    hatHighlight: '#6e492d',
    label: 'Cheyenne',
  },
  ghost: {
    primary: '#dde2ea',
    secondary: '#98a1af',
    highlight: '#f7f9fc',
    accent: '#545d6b',
    skin: '#dcaf92',
    skinShadow: '#b68567',
    hat: '#c8ced8',
    hatHighlight: '#edf1f7',
    label: 'Ghost',
  },
  belle: {
    primary: '#932456',
    secondary: '#621437',
    highlight: '#c4457d',
    accent: '#f6c2d8',
    skin: '#efc5ae',
    skinShadow: '#cb987d',
    hat: '#52112e',
    hatHighlight: '#882450',
    label: 'Belle',
  },
  marshal: {
    primary: '#1d324f',
    secondary: '#334e73',
    highlight: '#52739e',
    accent: '#f7ca52',
    skin: '#e0b393',
    skinShadow: '#b98968',
    hat: '#f4efe6',
    hatHighlight: '#ffffff',
    label: 'Marshal',
  },
};

interface Props {
  character: SpriteId;
  pose?: CharacterPose;
  size?: number;
  facing?: 'left' | 'right';
  className?: string;
}

/**
 * Original multi-part Western character illustrations. Each character has distinct
 * proportions, facial features, hat silhouette, costume, and pose-driven limb animations.
 */
export function CharacterSprite({ character, pose = 'idle', size = 64, facing = 'right', className = '' }: Props) {
  const p = CHARACTER_PALETTES[character];
  const height = Math.round(size * 1.35);
  const flip = facing === 'left' ? 'scale(-1, 1) translate(-80, 0)' : undefined;

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 80 108"
      className={`char-svg char-pose-${pose} ${className}`}
      aria-label={p.label}
      role="img"
    >
      <defs>
        <radialGradient id={`shadow-${character}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.65)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id={`coat-${character}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p.highlight} />
          <stop offset="42%" stopColor={p.primary} />
          <stop offset="100%" stopColor={p.secondary} />
        </linearGradient>
        <linearGradient id={`hat-${character}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={p.hatHighlight} />
          <stop offset="55%" stopColor={p.hat} />
          <stop offset="100%" stopColor="#120c08" />
        </linearGradient>
        <radialGradient id={`skin-${character}`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor={p.skin} />
          <stop offset="100%" stopColor={p.skinShadow} />
        </radialGradient>
      </defs>

      {/* Ambient ground shadow */}
      <ellipse cx="40" cy="102" rx="23" ry="4.8" fill={`url(#shadow-${character})`} />

      <g transform={flip}>
        {/* Legs & Boots (proportions vary per character) */}
        <g className="char-legs">
          {character === 'belle' ? (
            <>
              <path d="M25,65 Q40,61 55,65 L62,95 Q40,100 18,95 Z" fill={`url(#coat-${character})`} stroke="#1e0812" strokeWidth="1.5" />
              <path d="M23,77 Q40,83 57,77 L60,88 Q40,94 20,88 Z" fill={p.secondary} stroke="#1e0812" strokeWidth="1.1" />
              <path d="M20,92 Q40,97 60,92" fill="none" stroke={p.accent} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.85" />
              <path d="M28,95 L26,101 L36,101 L35,95 Z" fill="#29141b" stroke="#11060a" strokeWidth="1.2" />
              <path d="M45,95 L44,101 L55,101 L52,95 Z" fill="#29141b" stroke="#11060a" strokeWidth="1.2" />
            </>
          ) : (
            <>
              <rect
                x={character === 'tuco' ? 25 : 28}
                y="67"
                width={character === 'tuco' ? 11 : 9}
                height="26"
                rx="3"
                fill={character === 'doc' ? '#1c2a3c' : character === 'ghost' ? '#3a3f4a' : '#3a2b20'}
                stroke="#140d08"
                strokeWidth="1.5"
              />
              <rect
                x={character === 'tuco' ? 43 : 43}
                y="67"
                width={character === 'tuco' ? 11 : 9}
                height="26"
                rx="3"
                fill={character === 'doc' ? '#1c2a3c' : character === 'ghost' ? '#3a3f4a' : '#3a2b20'}
                stroke="#140d08"
                strokeWidth="1.5"
              />
              {/* Boot cuffs + soles */}
              <path d="M25,89 L38,89 L38,99 L22,99 Q22,93 25,89 Z" fill="#231812" stroke="#0f0906" strokeWidth="1.4" />
              <path d="M42,89 L55,89 L58,99 L42,99 Z" fill="#231812" stroke="#0f0906" strokeWidth="1.4" />
              <line x1="22" y1="98" x2="38" y2="98" stroke="#4f3928" strokeWidth="1.2" />
              <line x1="42" y1="98" x2="58" y2="98" stroke="#4f3928" strokeWidth="1.2" />
              {character === 'django' && (
                <>
                  <circle cx="24" cy="95" r="2" fill={p.accent} stroke="#4f340e" strokeWidth="0.6" />
                  <circle cx="41" cy="95" r="2" fill={p.accent} stroke="#4f340e" strokeWidth="0.6" />
                </>
              )}
            </>
          )}
        </g>

        {/* Torso & Character-Specific Costume */}
        <g className="char-torso">
          {character === 'django' && (
            <>
              <path d="M20,42 L57,42 L62,88 L47,87 L45,67 L35,67 L32,87 L16,88 Z" fill={`url(#coat-${character})`} stroke="#0f1116" strokeWidth="1.6" />
              <path d="M27,43 L52,43 L50,67 L29,67 Z" fill={p.secondary} stroke="#0f1116" strokeWidth="1.2" />
              {/* Coat lapels & crimson neck scarf */}
              <polygon points="33,42 40,51 47,42" fill="#8f2920" stroke="#240b08" strokeWidth="0.9" />
              <rect x="26" y="61" width="27" height="5" fill="#4f301b" stroke="#170e07" strokeWidth="1.2" />
              <rect x="37" y="60.5" width="6" height="6" rx="1" fill={p.accent} stroke="#634212" strokeWidth="0.8" />
            </>
          )}

          {character === 'tuco' && (
            <>
              <path d="M19,42 Q40,38 61,42 L64,70 Q40,75 16,70 Z" fill={`url(#coat-${character})`} stroke="#280b06" strokeWidth="1.6" />
              {/* Decorative woven poncho hem */}
              <path d="M17,67 Q40,72 63,67" fill="none" stroke={p.accent} strokeWidth="2.4" strokeDasharray="4 2" />
              <path d="M23,44 L57,66" stroke="#422614" strokeWidth="5.8" strokeLinecap="round" />
              <path d="M23,44 L57,66" stroke={p.accent} strokeWidth="3.6" strokeDasharray="2.5 2.5" />
              <path d="M57,44 L23,66" stroke="#422614" strokeWidth="5.8" strokeLinecap="round" />
              <path d="M57,44 L23,66" stroke={p.accent} strokeWidth="3.6" strokeDasharray="2.5 2.5" />
              <rect x="23" y="63" width="34" height="5" fill="#3d2415" stroke="#180e08" strokeWidth="1.2" />
            </>
          )}

          {character === 'doc' && (
            <>
              <path d="M26,41 L54,41 L54,71 L26,71 Z" fill={`url(#coat-${character})`} stroke="#0f1722" strokeWidth="1.6" />
              <polygon points="35,41 45,41 40,57" fill="#f7f2e8" />
              <polygon points="38,43 42,43 40,53" fill="#a82c2c" />
              <path d="M30,58 Q40,66 50,58" fill="none" stroke={p.accent} strokeWidth="1.8" />
              <circle cx="40" cy="61.5" r="2" fill={p.accent} />
              <circle cx="32.5" cy="48" r="1.3" fill={p.accent} />
              <circle cx="32.5" cy="53" r="1.3" fill={p.accent} />
            </>
          )}

          {character === 'cheyenne' && (
            <>
              <path d="M25,42 L55,42 L57,72 L23,72 Z" fill={p.secondary} stroke="#281a0d" strokeWidth="1.6" />
              <path d="M26,42 L40,57 L54,42 L54,51 L40,64 L26,51 Z" fill={`url(#coat-${character})`} stroke="#163822" strokeWidth="1.2" />
              {/* Buckskin fringes */}
              <path d="M24,72 L24,78 M28,72 L28,79 M32,72 L32,78 M48,72 L48,78 M52,72 L52,79 M56,72 L56,78" stroke="#d49e66" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="40" cy="55" r="3" fill={p.accent} stroke="#144d47" strokeWidth="1" />
            </>
          )}

          {character === 'ghost' && (
            <>
              <path d="M20,42 Q40,38 60,42 L65,75 L40,81 L15,75 Z" fill={`url(#coat-${character})`} stroke="#444a54" strokeWidth="1.6" />
              <path d="M23,66 L40,73 L57,66" fill="none" stroke={p.secondary} strokeWidth="2.4" />
              <path d="M28,45 L40,59 L52,45" fill="none" stroke={p.accent} strokeWidth="1.5" />
            </>
          )}

          {character === 'belle' && (
            <>
              <path d="M29,42 L51,42 L48,66 L32,66 Z" fill={`url(#coat-${character})`} stroke="#2a0a18" strokeWidth="1.5" />
              <path d="M32,42 Q40,50 48,42" fill={p.accent} stroke="#2a0a18" strokeWidth="1" />
              <path d="M36,47 L36,64 M44,47 L44,64" stroke="#f7dfeb" strokeWidth="1.1" strokeDasharray="2 2" />
              <circle cx="40" cy="51" r="2.1" fill="#f7ca52" stroke="#6b440e" strokeWidth="0.7" />
            </>
          )}

          {character === 'marshal' && (
            <>
              <path d="M22,41 L58,41 L61,77 L19,77 Z" fill={`url(#coat-${character})`} stroke="#0f1826" strokeWidth="1.7" />
              <rect x="35" y="42" width="10" height="22" fill="#f5f0e8" />
              <path d="M38,43 L42,43 L40,56 Z" fill="#18181b" />
              <polygon
                points="48,47 50,51 54,51 51,54 52,58 48,55.5 44,58 45,54 42,51 46,51"
                fill={p.accent}
                stroke="#6b4e11"
                strokeWidth="0.9"
              />
              <rect x="22" y="64" width="36" height="5" fill="#2e1d12" />
              <rect x="37" y="63.5" width="6" height="6" rx="1" fill={p.accent} />
            </>
          )}
        </g>

        {/* Back Arm */}
        <path
          d={character === 'belle' ? 'M29,45 L21,59' : 'M25,45 L18,62'}
          stroke={p.primary}
          strokeWidth={character === 'belle' ? 5.5 : 7}
          strokeLinecap="round"
        />
        <circle cx={character === 'belle' ? 21 : 18} cy={character === 'belle' ? 59 : 62} r="3" fill={p.skin} stroke="#2a1a10" strokeWidth="1" />

        {/* Head & Distinct Facial Features */}
        <g className="char-head">
          {character === 'cheyenne' && (
            <>
              <path d="M27,26 L23,48" stroke="#181513" strokeWidth="4.6" strokeLinecap="round" />
              <path d="M53,26 L57,48" stroke="#181513" strokeWidth="4.6" strokeLinecap="round" />
              <circle cx="24" cy="44" r="1.8" fill="#c93a2b" />
              <circle cx="56" cy="44" r="1.8" fill="#c93a2b" />
            </>
          )}
          {character === 'belle' && (
            <path d="M26,22 Q40,13 54,22 L55,37 Q40,32 25,37 Z" fill="#3b1914" stroke="#1f0b08" strokeWidth="1" />
          )}

          {/* Face with radial light */}
          <ellipse
            cx="40"
            cy="28"
            rx={character === 'tuco' ? 12 : character === 'doc' ? 10 : 11}
            ry={character === 'doc' ? 13 : 12}
            fill={`url(#skin-${character})`}
            stroke="#2a1a10"
            strokeWidth="1.5"
          />

          {/* Lively Eyes with specular glint */}
          <circle cx="36" cy="27" r="1.8" fill="#1b1512" />
          <circle cx="44" cy="27" r="1.8" fill="#1b1512" />
          <circle cx="36.6" cy="26.4" r="0.6" fill="#fff" />
          <circle cx="44.6" cy="26.4" r="0.6" fill="#fff" />

          {character === 'django' && (
            <>
              <path d="M33,24 L38,25.5 M42,25.5 L47,24" stroke="#1a1816" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M44,29 L48,33" stroke="#9e4d41" strokeWidth="1.3" />
              <path d="M35,33 Q40,31.5 45,33" fill="none" stroke="#2e1f18" strokeWidth="1.8" strokeLinecap="round" />
            </>
          )}
          {character === 'tuco' && (
            <>
              <path d="M32,32 Q40,29 48,32 Q45,36.5 40,34 Q35,36.5 32,32 Z" fill="#211612" />
              <path d="M33,23.5 L38,24.5 M42,24.5 L47,23.5" stroke="#211612" strokeWidth="2.1" strokeLinecap="round" />
            </>
          )}
          {character === 'doc' && (
            <>
              <circle cx="36" cy="27" r="3.5" fill="rgba(215,240,255,0.32)" stroke="#e5bf67" strokeWidth="1.3" />
              <circle cx="44" cy="27" r="3.5" fill="rgba(215,240,255,0.32)" stroke="#e5bf67" strokeWidth="1.3" />
              <line x1="39.5" y1="27" x2="40.5" y2="27" stroke="#e5bf67" strokeWidth="1.2" />
              <path d="M37,35 L43,34.5" stroke="#66402f" strokeWidth="1.4" strokeLinecap="round" />
            </>
          )}
          {character === 'cheyenne' && (
            <>
              <line x1="32.5" y1="30" x2="36" y2="30" stroke={p.accent} strokeWidth="1.7" strokeLinecap="round" />
              <line x1="44" y1="30" x2="47.5" y2="30" stroke={p.accent} strokeWidth="1.7" strokeLinecap="round" />
              <path d="M37,34 Q40,35.8 43,34" fill="none" stroke="#5e3222" strokeWidth="1.4" strokeLinecap="round" />
            </>
          )}
          {character === 'ghost' && (
            <path d="M29,29 Q40,32.5 51,29 L49,41 Q40,45 31,41 Z" fill="#f5f1e8" stroke="#454a54" strokeWidth="1.4" />
          )}
          {character === 'belle' && (
            <>
              <path d="M33.5,25.5 L35,26.5 M46.5,25.5 L45,26.5" stroke="#1f1116" strokeWidth="1.1" strokeLinecap="round" />
              <path d="M37.5,33.5 Q40,35.8 42.5,33.5" fill="#c73253" stroke="#5c1222" strokeWidth="0.9" />
            </>
          )}
          {character === 'marshal' && (
            <>
              <path d="M32,24 L38,25 M42,25 L48,24" stroke="#eae6dc" strokeWidth="1.9" strokeLinecap="round" />
              <path d="M30,33 Q36,28.5 40,32 Q44,28.5 50,33 Q46,37.5 40,34 Q34,37.5 30,33 Z" fill="#f5f0e7" stroke="#7c7568" strokeWidth="0.9" />
            </>
          )}
        </g>

        {/* Hats & Headgear */}
        <g className="char-hat">
          {character === 'django' && (
            <>
              <path d="M19,20 Q40,22.5 61,20 Q40,16.5 19,20 Z" fill={`url(#hat-${character})`} stroke="#0a0a0c" strokeWidth="1.4" />
              <path d="M29,20 L31,9 L49,9 L51,20 Z" fill={`url(#hat-${character})`} stroke="#0a0a0c" strokeWidth="1.3" />
              <rect x="30" y="16.5" width="20" height="2.6" fill={p.accent} />
            </>
          )}
          {character === 'tuco' && (
            <>
              <ellipse cx="40" cy="20" rx="25" ry="5" fill={`url(#hat-${character})`} stroke="#593f1a" strokeWidth="1.5" />
              <path d="M30,19 L34,7 Q40,5 46,7 L50,19 Z" fill={`url(#hat-${character})`} stroke="#593f1a" strokeWidth="1.4" />
              <rect x="31" y="16" width="18" height="2.6" fill={p.primary} />
            </>
          )}
          {character === 'doc' && (
            <>
              <ellipse cx="40" cy="20" rx="16.5" ry="3.5" fill={`url(#hat-${character})`} stroke="#0b0f16" strokeWidth="1.4" />
              <path d="M29,20 Q29,8 40,8 Q51,8 51,20 Z" fill={`url(#hat-${character})`} stroke="#0b0f16" strokeWidth="1.3" />
              <rect x="29" y="16.5" width="22" height="2.6" fill={p.accent} />
            </>
          )}
          {character === 'cheyenne' && (
            <>
              <path d="M28,21 Q40,18 52,21 L52,24.5 Q40,21.5 28,24.5 Z" fill={p.primary} stroke="#163822" strokeWidth="1.2" />
              <path d="M47,19 Q56,8 61,5 Q55,15 49,21 Z" fill="#f7f2ea" stroke="#362c24" strokeWidth="1.1" />
              <path d="M57,8 L61,5 L59,10 Z" fill="#1e1b18" />
            </>
          )}
          {character === 'ghost' && (
            <>
              <ellipse cx="40" cy="20" rx="19.5" ry="4.2" fill={`url(#hat-${character})`} stroke="#444a54" strokeWidth="1.4" />
              <path d="M30,20 L33,9 L47,9 L50,20 Z" fill={`url(#hat-${character})`} stroke="#444a54" strokeWidth="1.3" />
              <rect x="31" y="16.5" width="18" height="2.4" fill="#545b68" />
            </>
          )}
          {character === 'belle' && (
            <>
              <ellipse cx="43" cy="18" rx="11.5" ry="2.8" fill={`url(#hat-${character})`} stroke="#1f0711" strokeWidth="1.2" />
              <path d="M36,17 L38,9 L48,9 L50,17 Z" fill={`url(#hat-${character})`} stroke="#1f0711" strokeWidth="1.2" />
              <path d="M48,14 Q57,5 62,10 Q55,13 48,16 Z" fill={p.accent} />
            </>
          )}
          {character === 'marshal' && (
            <>
              <path d="M18.5,20 Q40,23 61.5,20 Q40,16 18.5,20 Z" fill={`url(#hat-${character})`} stroke="#5d5345" strokeWidth="1.5" />
              <path d="M29,19 L31,7 Q40,10 49,7 L51,19 Z" fill={`url(#hat-${character})`} stroke="#5d5345" strokeWidth="1.4" />
              <rect x="30" y="15.5" width="20" height="2.6" fill="#2c241b" />
            </>
          )}
        </g>

        {/* Front Arm + Action Pose Props */}
        <g className="char-front-arm">
          {pose === 'shoot' ? (
            <>
              <path d="M51,46 L66,46" stroke={p.primary} strokeWidth="6.5" strokeLinecap="round" />
              <circle cx="66" cy="46" r="2.8" fill={p.skin} />
              <path d="M65,43.5 L75,43.5 L75,46.8 L68,46.8 L67,51 L63.5,51 Z" fill="#2e3540" stroke="#0d0f12" strokeWidth="0.9" />
              <polygon points="75,45 80,40.5 78.5,45 80,49.5" fill="#ffd24d" />
            </>
          ) : pose === 'punch' ? (
            <>
              <path d="M51,46 L70,44" stroke={p.primary} strokeWidth="7" strokeLinecap="round" />
              <circle cx="72" cy="44" r="4.6" fill={p.skin} stroke="#2a1a10" strokeWidth="1.2" />
              <polygon points="75,39.5 80,44 75,48.5" fill="#ff5e40" />
            </>
          ) : pose === 'rob' ? (
            <>
              <path d="M51,46 L63,54" stroke={p.primary} strokeWidth="6.5" strokeLinecap="round" />
              <circle cx="66" cy="56" r="4.8" fill="#d9ad78" stroke="#523718" strokeWidth="1.2" />
              <text x="64" y="59" fontSize="6.5" fontWeight="bold" fill="#2b1b0a">$</text>
            </>
          ) : (
            <>
              <path d="M51,45 L58,61" stroke={p.primary} strokeWidth={character === 'belle' ? 5.5 : 7} strokeLinecap="round" />
              <circle cx="58" cy="61" r="2.8" fill={p.skin} stroke="#2a1a10" strokeWidth="0.9" />
            </>
          )}
        </g>

        {/* Hit Spark */}
        {pose === 'hit' && (
          <g>
            <polygon points="40,12 43,19 50,18 45,23 48,30 40,26 32,30 35,23 30,18 37,19" fill="#ff6642" opacity="0.92" />
          </g>
        )}
      </g>
    </svg>
  );
}
