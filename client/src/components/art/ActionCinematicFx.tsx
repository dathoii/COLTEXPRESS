import type { CSSProperties } from 'react';
import type { ActionClip, ClipPhase } from '../../hooks/useGameAnimations.js';
import type { Lang } from '../../i18n.js';
import { LootToken } from './LootToken.js';

export interface PointXY {
  x: number;
  y: number;
}

export interface TrackAnchors {
  actor?: PointXY;
  shooter?: PointXY;
  target?: PointXY;
  puncher?: PointXY;
  victim?: PointXY;
  lootDrop?: PointXY;
}

interface ActionCinematicFxProps {
  activeClip: ActionClip | null;
  clipPhase: ClipPhase | null;
  anchors: TrackAnchors;
  lang?: Lang;
}

function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}

function computeShotGeometry(from: PointXY, to: PointXY) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const rawDist = Math.hypot(dx, dy);
  const dist = Math.max(24, rawDist);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Offset slightly forward along firing axis so bullet emerges from revolver barrel.
  const nx = rawDist > 1 ? dx / rawDist : 1;
  const ny = rawDist > 1 ? dy / rawDist : 0;
  return {
    startX: from.x + nx * 18,
    startY: from.y - 6 + ny * 18,
    travelDist: Math.max(16, dist - 20),
    angleDeg,
    dir: dx >= 0 ? 1 : -1,
  };
}

/** Expressive SVG Mega-Fist for Punch strike cinematic. */
function MegaFistSvg({ uid, flipped }: { uid: number; flipped: boolean }) {
  return (
    <svg
      width="148"
      height="108"
      viewBox="0 0 120 90"
      className="fx-mega-fist-svg"
      style={flipped ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`fist-skin-${uid}`} x1="0%" y1="15%" x2="100%" y2="85%">
          <stop offset="0%" stopColor="#ffe5a3" />
          <stop offset="45%" stopColor="#f5a638" />
          <stop offset="100%" stopColor="#a84312" />
        </linearGradient>
        <linearGradient id={`fist-aura-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#ff3b1d" stopOpacity="0" />
          <stop offset="55%" stopColor="#ff7b1c" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#fff09a" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      {/* Sonic punch shock-cone */}
      <path d="M2,28 L66,10 L58,45 L68,80 L2,62 Z" fill={`url(#fist-aura-${uid})`} />
      {/* Speed impact lines behind fist */}
      <line x1="4" y1="22" x2="38" y2="22" stroke="#ffe59e" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="10" y1="45" x2="46" y2="45" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
      <line x1="4" y1="68" x2="36" y2="68" stroke="#ffe59e" strokeWidth="3.5" strokeLinecap="round" />
      {/* Muscular forearm & leather gauntlet */}
      <path
        d="M22,30 L56,24 L62,64 L22,60 Z"
        fill={`url(#fist-skin-${uid})`}
        stroke="#2f1104"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Main clenched fist & knuckles */}
      <path
        d="M52,18 C64,12 96,12 108,24 C116,32 117,56 106,66 C94,77 66,76 54,68 Z"
        fill={`url(#fist-skin-${uid})`}
        stroke="#2f1104"
        strokeWidth="3.8"
        strokeLinejoin="round"
      />
      {/* Thumb lock across top knuckles */}
      <path
        d="M58,20 C76,18 90,26 84,37 C77,42 62,38 56,31 Z"
        fill="#ffd07b"
        stroke="#2f1104"
        strokeWidth="2.8"
      />
      {/* Individual knuckle ridges */}
      <path d="M98,25 L108,30 M101,39 L112,41 M100,53 L110,55" stroke="#752908" strokeWidth="3" strokeLinecap="round" />
      <path d="M74,40 L74,71 M86,38 L86,72 M97,36 L97,68" stroke="#5c1e05" strokeWidth="2.4" strokeLinecap="round" />
      {/* Highlight crescent on forward knuckle edge */}
      <path d="M92,22 C104,26 108,42 102,58" fill="none" stroke="#fff7d6" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

/** Ornate glowing revolver slug + comet trail SVG. */
function GlowingBulletSvg({ uid }: { uid: number }) {
  return (
    <svg width="112" height="38" viewBox="0 0 78 28" className="fx-bullet-svg" aria-hidden="true">
      <defs>
        <linearGradient id={`trail-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#ff5a14" stopOpacity="0" />
          <stop offset="45%" stopColor="#ff9d2e" stopOpacity="0.72" />
          <stop offset="85%" stopColor="#fff3b0" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`slug-${uid}`} x1="0%" y1="10%" x2="0%" y2="90%">
          <stop offset="0%" stopColor="#fff6c7" />
          <stop offset="40%" stopColor="#f5b335" />
          <stop offset="100%" stopColor="#944710" />
        </linearGradient>
      </defs>
      {/* Flame & smoke ribbon */}
      <path d="M0,14 L48,5 L44,14 L48,23 Z" fill={`url(#trail-${uid})`} />
      <path d="M12,14 L52,9 L50,14 L52,19 Z" fill="#fff7d6" opacity="0.88" />
      {/* Brass bullet body */}
      <path
        d="M46,8 L60,8 C69,8 76,11.5 76,14 C76,16.5 69,20 60,20 L46,20 Z"
        fill={`url(#slug-${uid})`}
        stroke="#4a1d04"
        strokeWidth="1.8"
      />
      <ellipse cx="64" cy="12" rx="6" ry="1.8" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

export function ActionCinematicFx({
  activeClip,
  clipPhase,
  anchors,
  lang = 'vi',
}: ActionCinematicFxProps) {
  if (!activeClip || !clipPhase) return null;

  if (activeClip.type === 'shoot') {
    const shooterPt = anchors.shooter;
    const targetPt = anchors.target;
    if (!shooterPt) return null;

    const geom = targetPt ? computeShotGeometry(shooterPt, targetPt) : null;
    const hitLabel = lang === 'vi' ? 'ĂN ĐẠN!' : 'SHOT!';
    const drawLabel = lang === 'vi' ? 'RÚT SÚNG!' : 'DRAW!';

    return (
      <div className="train-cinematic-fx-layer" key={`clip-${activeClip.id}`} aria-hidden="true">
        {clipPhase === 'windup' && (
          <div className="fx-draw-halo" style={{ left: shooterPt.x, top: shooterPt.y - 16 }}>
            <span className="fx-draw-ring" />
            <span className="fx-comic-callout is-gold">{drawLabel}</span>
          </div>
        )}

        {clipPhase === 'travel' && geom && (
          <>
            <div
              className="fx-muzzle-blast"
              style={cssVars({
                left: `${geom.startX}px`,
                top: `${geom.startY}px`,
                '--angle': `${geom.angleDeg}deg`,
              })}
            />
            <div
              className="fx-bullet-trajectory"
              style={cssVars({
                left: `${geom.startX}px`,
                top: `${geom.startY}px`,
                '--angle': `${geom.angleDeg}deg`,
                '--travel-dist': `${geom.travelDist}px`,
              })}
            >
              <div className="fx-bullet-tracer-beam" />
              <div className="fx-bullet-runner">
                <GlowingBulletSvg uid={activeClip.id} />
              </div>
            </div>
          </>
        )}

        {clipPhase === 'impact' && targetPt && (
          <div className="fx-bullet-impact" style={{ left: targetPt.x, top: targetPt.y - 8 }}>
            <svg width="94" height="94" viewBox="0 0 100 100" className="fx-impact-star-svg">
              <polygon
                points="50,2 61,32 94,20 71,46 98,64 66,68 74,98 48,74 22,96 32,64 2,54 32,40 14,12 42,30"
                fill="#ff6b1a"
                stroke="#fff4a8"
                strokeWidth="3"
              />
              <polygon
                points="50,18 58,38 78,32 64,49 80,62 59,62 60,82 46,66 30,80 37,59 18,52 38,44 30,24 45,37"
                fill="#fff9d1"
              />
            </svg>
            <span className="fx-impact-shockring" />
            <span className="fx-comic-callout is-crimson">{hitLabel}</span>
          </div>
        )}
      </div>
    );
  }

  if (activeClip.type === 'punch') {
    const puncherPt = anchors.puncher;
    const victimPt = anchors.victim;
    if (!puncherPt) return null;

    const targetX = victimPt?.x ?? puncherPt.x + 56;
    const targetY = victimPt?.y ?? puncherPt.y;
    const dir = targetX >= puncherPt.x ? 1 : -1;
    // Mega fist emerges BEHIND puncher and smashes directly into victim.
    const fistStartX = puncherPt.x - dir * 56;
    const fistStartY = puncherPt.y - 6;
    const fistDx = targetX - fistStartX - dir * 24;
    const fistDy = targetY - fistStartY;

    const dropPt = anchors.lootDrop ?? { x: targetX + dir * 22, y: targetY + 6 };
    const lootDx = dropPt.x - targetX;
    const lootDy = dropPt.y - targetY;
    const powLabel = lang === 'vi' ? 'BỐP!' : 'POW!';

    return (
      <div className="train-cinematic-fx-layer" key={`clip-${activeClip.id}`} aria-hidden="true">
        {clipPhase === 'windup' && (
          <div className="fx-punch-charge-rings" style={{ left: puncherPt.x, top: puncherPt.y - 8 }}>
            <span className="fx-charge-ring r1" />
            <span className="fx-charge-ring r2" />
          </div>
        )}

        {clipPhase === 'strike' && (
          <div
            className="fx-mega-fist-wrap"
            style={cssVars({
              left: `${fistStartX}px`,
              top: `${fistStartY}px`,
              '--fist-dx': `${fistDx}px`,
              '--fist-dy': `${fistDy}px`,
            })}
          >
            <MegaFistSvg uid={activeClip.id} flipped={dir < 0} />
          </div>
        )}

        {clipPhase === 'impact' && (
          <>
            <div className="fx-punch-pow" style={{ left: targetX, top: targetY - 18 }}>
              <svg width="108" height="94" viewBox="0 0 100 90" className="fx-pow-svg">
                <polygon
                  points="50,4 63,28 94,16 74,42 96,64 66,64 70,86 48,68 24,84 32,58 4,50 32,36 16,12 43,28"
                  fill="#ffae24"
                  stroke="#421303"
                  strokeWidth="3.5"
                />
                <polygon
                  points="50,18 59,34 78,28 65,45 78,58 58,58 56,74 47,60 32,70 38,54 20,48 39,40 31,24 46,35"
                  fill="#fff7bf"
                />
              </svg>
              <span className="fx-comic-callout is-gold">{powLabel}</span>
            </div>

            {activeClip.lootType && (
              <div
                className="fx-loot-toss-wrap"
                style={cssVars({
                  left: `${targetX}px`,
                  top: `${targetY - 12}px`,
                  '--loot-dx': `${lootDx}px`,
                  '--loot-dy': `${lootDy}px`,
                })}
              >
                <div className="fx-loot-toss-bag">
                  <LootToken type={activeClip.lootType} size={38} />
                </div>
                <span className="fx-coin-spark c1">$</span>
                <span className="fx-coin-spark c2">$</span>
                <span className="fx-coin-spark c3">$</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (activeClip.type === 'marshal' && anchors.actor) {
    const pt = anchors.actor;
    return (
      <div className="train-cinematic-fx-layer" key={`clip-${activeClip.id}`} aria-hidden="true">
        <div
          className={`fx-marshal-halo-burst phase-${clipPhase}`}
          style={{ left: pt.x, top: pt.y - 6 }}
        >
          <span className="fx-marshal-sunrays" />
          <span className="fx-marshal-ring" />
        </div>
      </div>
    );
  }

  if (activeClip.type === 'rob' && anchors.actor) {
    const pt = anchors.actor;
    return (
      <div className="train-cinematic-fx-layer" key={`clip-${activeClip.id}`} aria-hidden="true">
        <div className="fx-rob-rise" style={{ left: pt.x, top: pt.y - 22 }}>
          <LootToken type={activeClip.lootType} size={28} />
          <span className="fx-comic-callout is-gold">+$</span>
        </div>
      </div>
    );
  }

  if ((activeClip.type === 'move' || activeClip.type === 'changeFloor') && anchors.actor) {
    const pt = anchors.actor;
    return (
      <div className="train-cinematic-fx-layer" key={`clip-${activeClip.id}`} aria-hidden="true">
        <div
          className={`fx-motion-focus ${activeClip.type === 'changeFloor' ? 'is-climb' : 'is-move'}`}
          style={{ left: pt.x, top: pt.y - 6 }}
        />
      </div>
    );
  }

  return null;
}
