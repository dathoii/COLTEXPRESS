import { useId } from 'react';
import type { ActionType, CharacterId, PlayerCard, RoundCard, RoundEventId, TurnType } from '@colt/shared';
import {
  ACTION_COPY,
  CHARACTER_COPY,
  EVENT_COPY_I18N,
  TURN_COPY_I18N,
  UI_STRINGS,
  type Lang,
} from '../../i18n.js';
import { CHARACTER_PALETTES, CharacterSprite } from './CharacterSprite.js';
import { CharacterPortrait } from './CharacterPortrait.js';
import { BulletToken, LootToken, MarshalBadge } from './LootToken.js';

export const ACTION_META: Record<ActionType, { title: string; rule: string }> = ACTION_COPY.en;

export const CHARACTER_RULES: Record<CharacterId, string> = CHARACTER_COPY.en;

function ActionArtwork({ action }: { action: ActionType }) {
  const uid = useId().replace(/:/g, '');
  switch (action) {
    case 'move': {
      const gradId = `moveArrow-${uid}`;
      return (
        <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9e4d18" />
              <stop offset="100%" stopColor="#e68432" />
            </linearGradient>
          </defs>
          <path d="M10,50 L54,50" stroke="#4d3119" strokeWidth="3.5" strokeDasharray="6 4" />
          <path d="M12,33 L39,33 L39,24 L56,36.5 L39,49 L39,40 L12,40 Z" fill={`url(#${gradId})`} stroke="#2b1708" strokeWidth="2" />
          <path d="M16,24 C22,12 36,12 43,21" fill="none" stroke="#965624" strokeWidth="2.4" strokeDasharray="3.5 3" strokeLinecap="round" />
          <polygon points="44,16 46,24 38,22" fill="#965624" />
        </svg>
      );
    }
    case 'changeFloor':
      return (
        <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true">
          <rect x="10" y="9" width="44" height="4" rx="1.5" fill="#704724" opacity="0.45" />
          <rect x="10" y="51" width="44" height="4" rx="1.5" fill="#704724" opacity="0.45" />
          <line x1="22" y1="8" x2="22" y2="56" stroke="#5e391c" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="42" y1="8" x2="42" y2="56" stroke="#5e391c" strokeWidth="4.5" strokeLinecap="round" />
          {[16, 26, 36, 46].map((y) => (
            <line key={y} x1="22" y1={y} x2="42" y2={y} stroke="#a66f3d" strokeWidth="3.4" strokeLinecap="round" />
          ))}
          <polygon points="53,12 59,23 47,23" fill="#d94432" stroke="#52160f" strokeWidth="1" />
          <polygon points="53,52 59,41 47,41" fill="#2c75b8" stroke="#103252" strokeWidth="1" />
        </svg>
      );
    case 'shoot': {
      const gunGradId = `steelGun-${uid}`;
      return (
        <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true">
          <defs>
            <linearGradient id={gunGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#697485" />
              <stop offset="50%" stopColor="#353c47" />
              <stop offset="100%" stopColor="#1b1f26" />
            </linearGradient>
          </defs>
          <path d="M18,35 L25,35 L20,51 L10,48 Z" fill="#6b3e22" stroke="#241309" strokeWidth="1.7" />
          <path d="M9,29 L44,26.5 L45,32.5 L26,35 L16,35 L10,33 Z" fill={`url(#${gunGradId})`} stroke="#111418" strokeWidth="1.8" />
          <circle cx="29" cy="30.5" r="4.8" fill="#7c8594" stroke="#111418" strokeWidth="1.4" />
          <circle cx="29" cy="30.5" r="1.5" fill="#d9a84a" />
          <polygon points="46,29 61,19 54,28.5 63,31.5 53,34 59,42 46,33" fill="#ffba38" stroke="#9e2a17" strokeWidth="1.2" />
          <polygon points="48,29.5 55,25.5 52,30 56,33.5 48,31.5" fill="#fff2b2" />
        </svg>
      );
    }
    case 'punch':
      return (
        <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true">
          <polygon points="32,6 38,19 53,15 44,28 58,36 42,40 44,56 32,46 20,56 22,40 6,36 20,28 11,15 26,19" fill="#f07e38" opacity="0.42" />
          <rect x="17" y="21" width="30" height="22" rx="8" fill="#dfb086" stroke="#3b2110" strokeWidth="2.2" />
          <path d="M20,37 Q32,42 44,37" fill="none" stroke="#b0744a" strokeWidth="1.5" />
          <line x1="24.5" y1="21" x2="24.5" y2="33" stroke="#3b2110" strokeWidth="1.7" />
          <line x1="32" y1="21" x2="32" y2="33" stroke="#3b2110" strokeWidth="1.7" />
          <line x1="39.5" y1="21" x2="39.5" y2="33" stroke="#3b2110" strokeWidth="1.7" />
        </svg>
      );
    case 'rob':
      return <LootToken type="purse" size={52} />;
    case 'marshal':
      return <MarshalBadge size={52} />;
  }
}

interface PlayingCardProps {
  card: PlayerCard | null;
  faceUp?: boolean;
  playable?: boolean;
  disabled?: boolean;
  compact?: boolean;
  lang?: Lang;
  onClick?: () => void;
}

function actionToPose(action: ActionType) {
  switch (action) {
    case 'shoot':
      return 'shoot' as const;
    case 'punch':
      return 'punch' as const;
    case 'rob':
      return 'rob' as const;
    case 'changeFloor':
      return 'climb' as const;
    case 'move':
    case 'marshal':
    default:
      return 'move' as const;
  }
}

function ActionCornerGlyph({ action }: { action: ActionType }) {
  switch (action) {
    case 'move':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M4,12 L15,12 M12,7 L19,12 L12,17" fill="none" stroke="#fff6db" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'changeFloor':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M8,18 L8,6 M5,9 L8,5 L11,9 M16,6 L16,18 M13,15 L16,19 L19,15" fill="none" stroke="#fff6db" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'shoot':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M3,10 L18,9 L18,12 L10,13 L7,19 L4,18 L6,13 L3,12 Z" fill="#fff6db" />
          <polygon points="19,8 23,6 20,11 23,13 19,13" fill="#ffcf48" />
        </svg>
      );
    case 'punch':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <rect x="5" y="7" width="14" height="10" rx="3" fill="#ffd8a8" stroke="#3b1d0a" strokeWidth="1.5" />
          <line x1="9.5" y1="7" x2="9.5" y2="13" stroke="#3b1d0a" strokeWidth="1.4" />
          <line x1="14" y1="7" x2="14" y2="13" stroke="#3b1d0a" strokeWidth="1.4" />
        </svg>
      );
    case 'rob':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M8,6 L16,6 L14,9 C18,11 19,20 12,20 C5,20 6,11 10,9 Z" fill="#f7cf6c" stroke="#3b230c" strokeWidth="1.3" />
          <text x="12" y="16.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#3b230c">$</text>
        </svg>
      );
    case 'marshal':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <polygon points="12,2 14.8,8.4 21.6,9 16.4,13.6 18,20.4 12,16.8 6,20.4 7.6,13.6 2.4,9 9.2,8.4" fill="#ffe066" stroke="#472a08" strokeWidth="1.2" />
        </svg>
      );
  }
}

export function PlayingCard({
  card,
  faceUp = true,
  playable = false,
  disabled = false,
  compact = false,
  lang = 'vi',
  onClick,
}: PlayingCardProps) {
  const isBullet = card?.kind === 'bullet';
  const owner = card && card.kind === 'action' ? card.owner : card && card.source !== 'neutral' ? card.source : 'marshal';
  const palette = CHARACTER_PALETTES[owner];
  const actionMap = ACTION_COPY[lang];
  const t = UI_STRINGS[lang];

  return (
    <button
      type="button"
      className={`western-card ${compact ? 'compact' : ''} ${faceUp ? 'is-front' : 'is-back'} ${playable ? 'is-playable' : ''} ${isBullet ? 'is-bullet' : ''}`}
      disabled={disabled || !onClick}
      onClick={onClick}
      title={
        !faceUp
          ? t.faceDownTooltip
          : card?.kind === 'action'
            ? `${actionMap[card.action].title}: ${actionMap[card.action].rule}`
            : card
              ? `${t.bulletCardTitle} (${card.source === 'neutral' ? t.marshalLabel : palette.label}) — ${t.bulletCardRule}`
              : t.hiddenTooltip
      }
    >
      <div className="western-card-inner">
        <div
          className="western-card-face western-card-front"
          style={{ ['--accent' as string]: palette.primary, borderColor: palette.primary }}
        >
          <span className="card-inner-frame" aria-hidden="true" />
          {card?.kind === 'action' ? (
            <>
              <div
                className="card-header"
                style={{
                  background: palette.primary,
                  color: owner === 'ghost' ? '#20150d' : undefined,
                  textShadow: owner === 'ghost' ? 'none' : undefined,
                }}
              >
                <span className="card-owner-tag">{palette.label}</span>
                <span className="card-action-corner" title={actionMap[card.action].title}>
                  <ActionCornerGlyph action={card.action} />
                </span>
              </div>
              <div className="card-art is-illustrated">
                <div className="card-scene-backdrop" aria-hidden="true" />
                <div className="card-character-pose">
                  <CharacterSprite character={owner} pose={actionToPose(card.action)} size={compact ? 46 : 62} />
                </div>
                <div className="card-action-inset">
                  <ActionArtwork action={card.action} />
                </div>
              </div>
              <div className="card-title">{actionMap[card.action].title}</div>
              {!compact && <div className="card-rule">{actionMap[card.action].rule}</div>}
            </>
          ) : card?.kind === 'bullet' ? (
            <>
              <div className="card-header" style={{ background: '#3a221d' }}>
                <span className="card-owner-tag">{card.source === 'neutral' ? t.marshalLabel.toUpperCase() : palette.label}</span>
              </div>
              <div className="card-art bullet-hole">
                <BulletToken isNeutral={card.source === 'neutral'} number={card.bullets} size={compact ? 34 : 46} />
              </div>
              <div className="card-title">{card.source === 'neutral' ? t.bulletCardTitle : `#${card.bullets}`}</div>
              {!compact && <div className="card-rule">{t.bulletCardRule}</div>}
            </>
          ) : (
            <div className="card-title">{t.hiddenTooltip}</div>
          )}
        </div>

        <div className="western-card-face western-card-back">
          <span className="card-back-frame" aria-hidden="true" />
          <div className="card-back-crest">
            <MarshalBadge size={compact ? 26 : 38} />
            <span>COLT 1899</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function CharacterCardTile({
  character,
  selected,
  takenBy,
  disabled,
  lang = 'vi',
  variant = 'portrait',
  onSelect,
}: {
  character: CharacterId;
  selected: boolean;
  takenBy?: string;
  disabled: boolean;
  lang?: Lang;
  variant?: 'portrait' | 'sprite';
  onSelect: () => void;
}) {
  const pal = CHARACTER_PALETTES[character];
  const t = UI_STRINGS[lang];
  const rules = CHARACTER_COPY[lang];
  const isLightBanner = character === 'ghost';

  if (variant === 'portrait') {
    return (
      <div
        className={`char-card is-portrait ${selected ? 'selected' : ''} ${takenBy && !selected ? 'taken' : ''}`}
        style={{ ['--char-color' as string]: pal.primary, borderColor: selected ? '#f5cb5c' : pal.primary }}
      >
        <div className="char-card-portrait-wrap">
          <CharacterPortrait character={character} size={72} pose={selected ? 'shoot' : 'idle'} variant="card" />
        </div>
        <div
          className={`char-card-banner ${isLightBanner ? 'light-banner' : ''}`}
          style={{ background: pal.primary }}
        >
          <strong>{pal.label}</strong>
        </div>
        <div className="char-card-body">
          <p className="char-ability">{rules[character]}</p>
        </div>
        <button type="button" disabled={disabled} onClick={onSelect}>
          {selected ? t.selectedClear : takenBy ? `${t.takenBy}: ${takenBy}` : `${t.playAs} ${pal.label}`}
        </button>
      </div>
    );
  }

  return (
    <div className={`char-card ${selected ? 'selected' : ''}`} style={{ borderColor: selected ? '#f0c24d' : pal.primary }}>
      <div className="char-card-banner" style={{ background: pal.primary }}>
        <strong>{pal.label}</strong>
      </div>
      <div className="char-card-body">
        <CharacterSprite character={character} size={58} pose={selected ? 'shoot' : 'idle'} />
        <p className="char-ability">{rules[character]}</p>
      </div>
      <button type="button" disabled={disabled} onClick={onSelect}>
        {selected ? t.selectedClear : takenBy ? `${t.takenBy}: ${takenBy}` : `${t.playAs} ${pal.label}`}
      </button>
    </div>
  );
}

const EVENT_COPY: Record<RoundEventId, { label: string; desc: string }> = EVENT_COPY_I18N.en;

const TURN_BADGE: Record<TurnType, { sym: string; label: string }> = {
  normal: TURN_COPY_I18N.en.normal,
  tunnel: TURN_COPY_I18N.en.tunnel,
  speedingUp: TURN_COPY_I18N.en.speedingUp,
  switching: TURN_COPY_I18N.en.switching,
};

export function RoundCardDisplay({
  round,
  activeTurn,
  lang = 'vi',
}: {
  round: RoundCard;
  activeTurn: number | null;
  lang?: Lang;
}) {
  const ev = (EVENT_COPY_I18N[lang] ?? EVENT_COPY)[round.event];
  const turnMap = TURN_COPY_I18N[lang] ?? TURN_BADGE;
  const t = UI_STRINGS[lang];
  return (
    <div className={`round-ticket ${round.kind === 'station' ? 'is-station' : ''}`}>
      <div className="round-ticket-head">
        <span className="ticket-tag">
          {round.kind === 'station' ? t.stationCardTag : `${t.roundCardTag} (${round.bracket}P)`}
        </span>
        <strong>{ev.label}</strong>
      </div>
      <div className="turn-track">
        {round.turns.map((turn, i) => {
          const meta = turnMap[turn];
          return (
            <div key={i} className={`turn-slot ${turn} ${activeTurn === i ? 'active' : ''}`} title={meta.label}>
              <span className="turn-sym">{meta.sym}</span>
              <span className="turn-name">{meta.short}</span>
            </div>
          );
        })}
      </div>
      <div className="round-event-line">
        <strong>{t.eventLabel} — {ev.label}:</strong> <span>{ev.desc}</span>
      </div>
    </div>
  );
}
