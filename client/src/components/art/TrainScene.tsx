import { useLayoutEffect, useRef, useState } from 'react';
import type {
  GameView,
  LootType,
  PendingDecision,
  PlayerView,
  Position,
  ResolutionChoice,
  TrainCarView,
} from '@colt/shared';
import type { ActionClip, ClipPhase, GameAnimationState } from '../../hooks/useGameAnimations.js';
import { UI_STRINGS, type Lang } from '../../i18n.js';
import { ActionCinematicFx, type PointXY, type TrackAnchors } from './ActionCinematicFx.js';
import { CharacterSprite } from './CharacterSprite.js';
import { LootToken, MarshalBadge } from './LootToken.js';

interface Props {
  game: GameView;
  viewerId: string | null;
  anim: GameAnimationState;
  animationsEnabled: boolean;
  lang?: Lang;
  pendingDecision?: PendingDecision | null;
  isMyDecision?: boolean;
  selectedPunchTargetId?: string | null;
  selectedPunchLoot?: LootType | null | 'unset';
  onSelectChoice?: (choice: ResolutionChoice) => void;
  onSelectPunchTarget?: (targetId: string) => void;
}

function LocomotiveBackdrop() {
  return (
    <svg className="car-architecture-svg" viewBox="0 0 240 210" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="boilerSteel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#58616e" />
          <stop offset="30%" stopColor="#353b45" />
          <stop offset="72%" stopColor="#1e2229" />
          <stop offset="100%" stopColor="#101216" />
        </linearGradient>
        <linearGradient id="brassSheen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe18c" />
          <stop offset="50%" stopColor="#d69a38" />
          <stop offset="100%" stopColor="#7d5314" />
        </linearGradient>
        <linearGradient id="cabWood" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7d4928" />
          <stop offset="100%" stopColor="#3d2110" />
        </linearGradient>
        <radialGradient id="fireGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#ffdc7a" />
          <stop offset="55%" stopColor="#f06824" />
          <stop offset="100%" stopColor="rgba(180,35,10,0)" />
        </radialGradient>
      </defs>

      {/* Diamond Smokestack & Headlamp */}
      <polygon points="34,33 64,33 56,62 42,62" fill="#1b1e24" stroke="url(#brassSheen)" strokeWidth="1.8" />
      <rect x="31" y="28" width="36" height="5.5" rx="2.5" fill="url(#brassSheen)" />
      <ellipse cx="49" cy="30.5" rx="12" ry="1.8" fill="#f06424" opacity="0.55" />
      <rect x="13" y="63" width="15" height="15" rx="2.5" fill="#2c3038" stroke="url(#brassSheen)" strokeWidth="1.6" />
      <circle cx="15" cy="70.5" r="3.8" fill="#fff2b0" />
      <polygon points="14,70.5 0,56 0,86" fill="rgba(255,224,130,0.28)" />

      {/* Riveted Steam Boiler & Dual Brass Domes */}
      <rect x="28" y="61" width="110" height="58" rx="10" fill="url(#boilerSteel)" stroke="#0d0e11" strokeWidth="2" />
      <line x1="34" y1="73" x2="134" y2="73" stroke="#96562a" strokeWidth="1.8" opacity="0.8" />
      {[52, 85, 118].map((bx) => (
        <g key={bx}>
          <rect x={bx} y="61" width="5.5" height="58" fill="url(#brassSheen)" />
          {[68, 88, 110].map((ry) => (
            <circle key={ry} cx={bx + 2.75} cy={ry} r="1" fill="#4f320a" />
          ))}
        </g>
      ))}
      <path d="M82,61 Q93,41 104,61 Z" fill="url(#brassSheen)" stroke="#5c3d0c" strokeWidth="1.4" />
      <path d="M111,61 Q118,49 125,61 Z" fill="url(#brassSheen)" stroke="#5c3d0c" strokeWidth="1.4" />

      {/* Engineer Cab Cutaway */}
      <rect x="136" y="42" width="98" height="114" rx="3" fill="url(#cabWood)" stroke="#1d1109" strokeWidth="2" />
      <path d="M127,42 L239,42 L234,33 L132,33 Z" fill="#2b190d" stroke="url(#brassSheen)" strokeWidth="1.6" />
      {/* Interior cutaway wall with firebox & pressure dials */}
      <rect x="142" y="54" width="86" height="92" rx="3" fill="#21130a" stroke="#8c5a32" strokeWidth="1.6" />
      <circle cx="151" cy="70" r="6" fill="url(#fireGlow)" />
      <circle cx="151" cy="70" r="3" fill="#ffe18c" opacity="0.9" />
      <circle cx="164" cy="68" r="3.6" fill="#f2e6cf" stroke="#b5832e" strokeWidth="1.2" />
      <line x1="164" y1="68" x2="166" y2="66" stroke="#c93022" strokeWidth="1" />
      <rect x="143" y="137" width="84" height="9" fill="#573720" />

      {/* Cowcatcher & Heavy Frame */}
      <polygon points="1,156 30,116 30,156" fill="#7a2c1d" stroke="#18120f" strokeWidth="2" />
      <line x1="7" y1="147" x2="29" y2="147" stroke="#eab755" strokeWidth="1.7" />
      <line x1="13" y1="137" x2="29" y2="137" stroke="#eab755" strokeWidth="1.7" />
      <line x1="19" y1="127" x2="29" y2="127" stroke="#eab755" strokeWidth="1.5" />
      <rect x="26" y="146" width="212" height="14" fill="#181a1f" stroke="#0b0c0f" strokeWidth="1.5" />

      {/* Spoked Driving Wheels & Piston */}
      {[74, 124, 174, 212].map((cx, i) => (
        <g key={cx} className="train-wheel" style={{ transformOrigin: `${cx}px 175px` }}>
          <circle cx={cx} cy="175" r={i < 2 ? 22 : 16} fill="#261a18" stroke="#c8cdd6" strokeWidth="2" />
          <circle cx={cx} cy="175" r={i < 2 ? 19.5 : 13.5} fill="none" stroke="#b32929" strokeWidth="3.2" />
          <circle cx={cx} cy="175" r="5.5" fill="url(#brassSheen)" />
          <line x1={cx - (i < 2 ? 16 : 11)} y1="175" x2={cx + (i < 2 ? 16 : 11)} y2="175" stroke="#9aa2b0" strokeWidth="2" />
          <line x1={cx} y1={175 - (i < 2 ? 16 : 11)} x2={cx} y2={175 + (i < 2 ? 16 : 11)} stroke="#9aa2b0" strokeWidth="2" />
        </g>
      ))}
      <rect x="66" y="171" width="112" height="6" rx="3" fill="#d0d6e0" stroke="#2c313b" strokeWidth="1.3" className="piston-rod" />
    </svg>
  );
}

function PassengerCarBackdrop({ index, isCaboose }: { index: number; isCaboose: boolean }) {
  const accentColors = ['#7d2626', '#255c43', '#7d561f', '#2f4570', '#692c5f', '#823b1e'];
  const trim = accentColors[index % accentColors.length]!;
  return (
    <svg className="car-architecture-svg" viewBox="0 0 220 210" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`coachWall-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#382012" />
          <stop offset="65%" stopColor="#26150c" />
          <stop offset="100%" stopColor="#1b0e07" />
        </linearGradient>
        <radialGradient id={`lampBloom-${index}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 224, 130, 0.42)" />
          <stop offset="100%" stopColor="rgba(255, 210, 110, 0)" />
        </radialGradient>
        <linearGradient id={`glassPane-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 198, 128, 0.42)" />
          <stop offset="55%" stopColor="rgba(218, 126, 68, 0.24)" />
          <stop offset="100%" stopColor="rgba(95, 42, 24, 0.35)" />
        </linearGradient>
      </defs>

      {/* Clerestory Roof with Glowing Transom Vents */}
      <rect x="20" y="27" width="180" height="11" rx="3" fill="#3a2315" stroke="#180e08" strokeWidth="1.5" />
      {[34, 62, 90, 118, 146, 174].map((vx) => (
        <rect key={vx} x={vx} y="30" width="14" height="4" rx="1" fill="#ffd98a" opacity="0.55" />
      ))}
      <rect x="3" y="37" width="214" height="11.5" rx="2.5" fill="#593620" stroke="#180e08" strokeWidth="1.6" />
      <line x1="8" y1="42" x2="212" y2="42" stroke="#8a5a38" strokeWidth="1.5" strokeDasharray="11 4" />

      {/* Cutaway Passenger Coach Interior */}
      <rect x="8" y="48" width="204" height="104" fill={`url(#coachWall-${index})`} stroke="#140c06" strokeWidth="2" />
      <rect x="11" y="48.5" width="198" height="13" fill={trim} />
      <line x1="11" y1="61.5" x2="209" y2="61.5" stroke="#e0ad53" strokeWidth="1.1" opacity="0.7" />
      {/* Wainscot lower paneling */}
      <rect x="12" y="114" width="196" height="22" fill="#3d2213" opacity="0.75" />

      {/* Arched Windows + Glass Glare + Velvet Valance */}
      {[28, 88, 148].map((x) => (
        <g key={x}>
          <path d={`M${x},112 L${x},76 Q${x + 21},62 ${x + 42},76 L${x + 42},112 Z`} fill="#4d2d1d" stroke="#a87447" strokeWidth="1.6" />
          <path d={`M${x + 4},109 L${x + 4},78 Q${x + 21},67 ${x + 38},78 L${x + 38},109 Z`} fill={`url(#glassPane-${index})`} />
          <line x1={x + 8} y1="104" x2={x + 24} y2="75" stroke="rgba(255,244,210,0.28)" strokeWidth="2" />
          <path d={`M${x + 3},76 L${x + 12},76 L${x + 7},90 L${x + 3},90 Z`} fill={trim} opacity="0.9" />
          <path d={`M${x + 39},76 L${x + 30},76 L${x + 35},90 L${x + 39},90 Z`} fill={trim} opacity="0.9" />
        </g>
      ))}

      {/* Brass Gasoliers with Warm Radial Bloom */}
      {[56, 164].map((x) => (
        <g key={x}>
          <circle cx={x} cy="64" r="18" fill={`url(#lampBloom-${index})`} />
          <line x1={x} y1="49" x2={x} y2="61" stroke="#c99a42" strokeWidth="1.5" />
          <circle cx={x} cy="63" r="4.6" fill="#ffe79e" stroke="#a6721f" strokeWidth="0.9" />
        </g>
      ))}

      {/* Velvet Seats, Carpet Runner & Oak Floor */}
      <rect x="14" y="132" width="192" height="14" fill="#4f2f1a" stroke="#1b1008" strokeWidth="1.2" />
      <rect x="30" y="134" width="160" height="3.5" fill={trim} opacity="0.85" />
      <rect x="19" y="121" width="25" height="12" rx="2.5" fill={trim} stroke="#1a0d08" strokeWidth="1" />
      <rect x="176" y="121" width="25" height="12" rx="2.5" fill={trim} stroke="#1a0d08" strokeWidth="1" />
      {isCaboose && (
        <g>
          <rect x="199" y="64" width="14" height="72" fill="#592c1b" stroke="#1a0d07" strokeWidth="1.5" />
          <circle cx="215" cy="94" r="3.5" fill="#e6392e" stroke="#47100b" strokeWidth="1" />
        </g>
      )}

      {/* Steel Chassis & Twin Bogie Wheels */}
      <rect x="4" y="150" width="212" height="12" fill="#181a1f" stroke="#0b0c0f" strokeWidth="1.5" />
      {[32, 62, 158, 188].map((cx) => (
        <g key={cx} className="train-wheel" style={{ transformOrigin: `${cx}px 177px` }}>
          <circle cx={cx} cy="177" r="14" fill="#2b201e" stroke="#c4cad4" strokeWidth="1.6" />
          <circle cx={cx} cy="177" r="12" fill="none" stroke="#6f7582" strokeWidth="2.8" />
          <circle cx={cx} cy="177" r="4.2" fill="#dfb054" />
          <line x1={cx - 10} y1="177" x2={cx + 10} y2="177" stroke="#969eab" strokeWidth="1.5" />
          <line x1={cx} y1="167" x2={cx} y2="187" stroke="#969eab" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

interface CameraTransform {
  transform: string;
  isZoomed: boolean;
}

function findActorEl(trackRow: HTMLElement, actorId: string): HTMLElement | null {
  const nodes = trackRow.querySelectorAll<HTMLElement>('[data-actor-id]');
  for (let i = 0; i < nodes.length; i += 1) {
    if (nodes[i]?.getAttribute('data-actor-id') === actorId) {
      return nodes[i] ?? null;
    }
  }
  return null;
}

function measureInAncestor(
  el: HTMLElement | null,
  ancestor: HTMLElement | null,
  scrollEl: HTMLElement | null = null,
): PointXY | null {
  if (!el || !ancestor) return null;
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  let cur: HTMLElement | null = el;
  while (cur && cur !== ancestor) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  if (cur !== ancestor) return null;
  if (scrollEl && ancestor !== scrollEl) {
    x -= scrollEl.scrollLeft;
    y -= scrollEl.scrollTop;
  }
  return { x, y };
}

function mixPoint(a: PointXY | null, b: PointXY | null, t: number): PointXY | null {
  if (!a) return b;
  if (!b) return a;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function getVisualPlayerPosition(
  p: PlayerView,
  clip: ActionClip | null,
  phase: ClipPhase | null,
): Position {
  if (!clip || !phase) return p.position;
  if (clip.type === 'shoot' && p.id === clip.targetId && (phase === 'windup' || phase === 'travel')) {
    return clip.targetStartPos;
  }
  if (clip.type === 'punch' && p.id === clip.targetId && (phase === 'windup' || phase === 'strike')) {
    return clip.victimFrom;
  }
  if (
    (clip.type === 'move' || clip.type === 'changeFloor') &&
    p.id === clip.playerId &&
    phase === 'focus'
  ) {
    return clip.from;
  }
  if (clip.type === 'marshal' && (phase === 'aura' || phase === 'zoom') && clip.caughtIds.includes(p.id)) {
    return { car: clip.toCar, floor: 'inside' };
  }
  return p.position;
}

export function TrainScene({
  game,
  viewerId,
  anim,
  animationsEnabled,
  lang = 'vi',
  pendingDecision = null,
  isMyDecision = false,
  selectedPunchTargetId = null,
  selectedPunchLoot = 'unset',
  onSelectChoice,
  onSelectPunchTarget,
}: Props) {
  const t = UI_STRINGS[lang];
  const stageRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRowRef = useRef<HTMLDivElement>(null);

  const [anchors, setAnchors] = useState<TrackAnchors>({});
  const [camera, setCamera] = useState<CameraTransform>({ transform: '', isZoomed: false });

  const activeClip = animationsEnabled ? anim.activeClip : null;
  const clipPhase = animationsEnabled ? anim.clipPhase : null;
  const effectiveMarshalCar =
    activeClip?.type === 'marshal' && (clipPhase === 'aura' || clipPhase === 'zoom')
      ? activeClip.fromCar
      : game.marshalCar;

  useLayoutEffect(() => {
    const stageEl = stageRef.current;
    const rigEl = rigRef.current;
    const scrollEl = scrollRef.current;
    const trackRowEl = trackRowRef.current;

    if (!animationsEnabled || !activeClip || !clipPhase || !stageEl || !rigEl || !trackRowEl) {
      setAnchors((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setCamera((prev) => (!prev.isZoomed && prev.transform === '' ? prev : { transform: '', isZoomed: false }));
      return;
    }

    const stageW = stageEl.clientWidth;
    const stageH = stageEl.clientHeight;
    if (stageW < 40 || stageH < 40) {
      setCamera({ transform: '', isZoomed: false });
      return;
    }

    // Adaptive close-up boost: roomy 1080p/900p arenas zoom strongly (~2.1x-2.4x) onto the 210px train,
    // while tighter laptop/mobile screens frame comfortably (~1.55x-1.85x) without cropping participants.
    const heroBoost = Math.max(1.05, Math.min(1.65, stageH / 340));
    const spanScale = (a: PointXY | null, b: PointXY | null, pad = 210) => {
      if (!a || !b) return 2.35;
      return Math.max(1.38, Math.min(2.35, (stageW * 0.86) / (Math.abs(a.x - b.x) + pad)));
    };

    const nextAnchors: TrackAnchors = {};
    let focusTrackPt: PointXY | null = null;
    let zoomScale = 1;

    if (activeClip.type === 'shoot') {
      const shooterEl = findActorEl(trackRowEl, activeClip.shooterId);
      const targetEl = findActorEl(trackRowEl, activeClip.targetId);
      const sPt = measureInAncestor(shooterEl, trackRowEl);
      const tPt = measureInAncestor(targetEl, trackRowEl);
      if (sPt) nextAnchors.shooter = sPt;
      if (tPt) nextAnchors.target = tPt;

      if (clipPhase === 'windup') {
        focusTrackPt = sPt;
        zoomScale = Math.min(2.42, 1.46 * heroBoost);
      } else if (clipPhase === 'travel') {
        focusTrackPt = mixPoint(sPt, tPt, 0.52);
        zoomScale = Math.min(spanScale(sPt, tPt), 1.32 * heroBoost);
      } else {
        focusTrackPt = tPt ?? sPt;
        zoomScale = Math.min(2.42, 1.44 * heroBoost);
      }
    } else if (activeClip.type === 'punch') {
      const puncherEl = findActorEl(trackRowEl, activeClip.puncherId);
      const victimEl = findActorEl(trackRowEl, activeClip.targetId);
      const pPt = measureInAncestor(puncherEl, trackRowEl);
      const vPt = measureInAncestor(victimEl, trackRowEl);
      if (pPt) nextAnchors.puncher = pPt;
      if (vPt) nextAnchors.victim = vPt;
      if (activeClip.stolenByCheyenne && pPt) {
        nextAnchors.lootDrop = pPt;
      } else if (vPt) {
        const dir = pPt && vPt.x < pPt.x ? -1 : 1;
        nextAnchors.lootDrop = { x: vPt.x + dir * 24, y: vPt.y + 18 };
      }

      if (clipPhase === 'windup') {
        focusTrackPt = pPt;
        zoomScale = Math.min(2.45, 1.48 * heroBoost);
      } else if (clipPhase === 'strike') {
        focusTrackPt = mixPoint(pPt, vPt, 0.5);
        zoomScale = Math.min(spanScale(pPt, vPt, 240), 1.38 * heroBoost);
      } else {
        focusTrackPt = vPt ?? pPt;
        zoomScale = Math.min(2.4, 1.44 * heroBoost);
      }
    } else if (activeClip.type === 'move' || activeClip.type === 'changeFloor') {
      const actorEl = findActorEl(trackRowEl, activeClip.playerId);
      const aPt = measureInAncestor(actorEl, trackRowEl);
      if (aPt) nextAnchors.actor = aPt;
      focusTrackPt = aPt;
      zoomScale = Math.min(2.35, (clipPhase === 'focus' ? 1.42 : 1.36) * heroBoost);
    } else if (activeClip.type === 'marshal') {
      const marshalEl = findActorEl(trackRowEl, '__marshal__');
      const mPt = measureInAncestor(marshalEl, trackRowEl);
      if (mPt) nextAnchors.actor = mPt;
      focusTrackPt = mPt;
      if (clipPhase === 'aura') zoomScale = Math.min(1.62, 1.18 * heroBoost);
      else if (clipPhase === 'zoom') zoomScale = Math.min(2.26, 1.36 * heroBoost);
      else zoomScale = Math.min(2.18, 1.32 * heroBoost);
    } else if (activeClip.type === 'rob') {
      const actorEl = findActorEl(trackRowEl, activeClip.playerId);
      const rPt = measureInAncestor(actorEl, trackRowEl);
      if (rPt) nextAnchors.actor = rPt;
      focusTrackPt = rPt;
      zoomScale = Math.min(2.26, 1.36 * heroBoost);
    }

    setAnchors(nextAnchors);

    if (!focusTrackPt || zoomScale <= 1.01) {
      setCamera({ transform: '', isZoomed: false });
      return;
    }

    if (scrollEl && scrollEl.scrollWidth > scrollEl.clientWidth + 4) {
      const targetScroll = focusTrackPt.x - scrollEl.clientWidth / 2;
      scrollEl.scrollLeft = Math.max(0, Math.min(scrollEl.scrollWidth - scrollEl.clientWidth, targetScroll));
    }

    const trackOrigin = measureInAncestor(trackRowEl, rigEl, scrollEl);
    const trackBoxOffsetX = trackOrigin ? trackOrigin.x - trackRowEl.offsetWidth / 2 : 0;
    const trackBoxOffsetY = trackOrigin ? trackOrigin.y - trackRowEl.offsetHeight / 2 : 0;
    const rigPtX = trackBoxOffsetX + focusTrackPt.x;
    const rigPtY = trackBoxOffsetY + focusTrackPt.y;

    const minTx = -(zoomScale - 1) * stageW;
    const minTy = -(zoomScale - 1) * stageH;
    const rawTx = stageW * 0.5 - zoomScale * rigPtX;
    const rawTy = stageH * 0.56 - zoomScale * rigPtY;
    const tx = Math.max(minTx, Math.min(0, rawTx));
    const ty = Math.max(minTy, Math.min(0, rawTy));

    setCamera({
      transform: `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${zoomScale.toFixed(3)})`,
      isZoomed: true,
    });
  }, [animationsEnabled, activeClip, clipPhase, game.version]);

  const activePlayerId =
    game.phase === 'planning' && game.planning
      ? game.planning.order[game.planning.orderIndex]
      : game.phase === 'execution' && game.execution?.pending
        ? game.execution.pending.playerId
        : null;

  const opts = isMyDecision && pendingDecision ? pendingDecision.options : [];
  const pendingActor = pendingDecision
    ? game.players.find((p) => p.id === pendingDecision.playerId) ?? null
    : null;

  // Compute interactive zone click handler (Move, ChangeFloor, Marshal, or Punch knock-destination)
  const getZoneAction = (
    carIndex: number,
    floor: 'roof' | 'inside',
  ): { label: string; kind: 'move' | 'marshal' | 'knock'; onClick: () => void } | null => {
    if (!isMyDecision || !pendingDecision || !onSelectChoice) return null;

    const moveChoice = opts.find(
      (o): o is Extract<ResolutionChoice, { type: 'move' | 'changeFloor' }> =>
        (o.type === 'move' || o.type === 'changeFloor') && o.to.car === carIndex && o.to.floor === floor,
    );
    if (moveChoice) {
      return {
        label: moveChoice.type === 'changeFloor' ? t.climbHere : t.moveHere,
        kind: 'move',
        onClick: () => onSelectChoice(moveChoice),
      };
    }

    if (floor === 'inside') {
      const marshalChoice = opts.find(
        (o): o is Extract<ResolutionChoice, { type: 'marshal' }> => o.type === 'marshal' && o.toCar === carIndex,
      );
      if (marshalChoice) {
        return {
          label: t.marshalHere,
          kind: 'marshal',
          onClick: () => onSelectChoice(marshalChoice),
        };
      }
    }

    if (pendingDecision.card.action === 'punch' && selectedPunchTargetId) {
      const forTarget = opts.filter(
        (o): o is Extract<ResolutionChoice, { type: 'punch' }> =>
          o.type === 'punch' && o.targetId === selectedPunchTargetId,
      );
      const distinctLoots = new Set(forTarget.map((o) => o.lootType));
      const pool =
        selectedPunchLoot !== 'unset'
          ? forTarget.filter((o) => o.lootType === selectedPunchLoot)
          : distinctLoots.size <= 1
            ? forTarget
            : [];
      const knockMatch = pool.find((o) => o.to && o.to.car === carIndex && o.to.floor === floor);
      if (knockMatch) {
        return {
          label: t.knockHere,
          kind: 'knock',
          onClick: () => onSelectChoice(knockMatch),
        };
      }
    }

    return null;
  };

  // Compute clickable bandit handler (Shoot or Punch)
  const getBanditTargetAction = (
    p: PlayerView,
  ): { label: string; selected: boolean; onClick: () => void } | null => {
    if (!isMyDecision || !pendingDecision) return null;

    const shootChoice = opts.find(
      (o): o is Extract<ResolutionChoice, { type: 'shoot' }> => o.type === 'shoot' && o.targetId === p.id,
    );
    if (shootChoice && onSelectChoice) {
      return {
        label: t.shootTarget,
        selected: false,
        onClick: () => onSelectChoice(shootChoice),
      };
    }

    const punchChoices = opts.filter(
      (o): o is Extract<ResolutionChoice, { type: 'punch' }> => o.type === 'punch' && o.targetId === p.id,
    );
    if (punchChoices.length > 0) {
      const isSelected = selectedPunchTargetId === p.id;
      return {
        label: t.punchTarget,
        selected: isSelected,
        onClick: () => {
          if (punchChoices.length === 1 && onSelectChoice) {
            onSelectChoice(punchChoices[0]!);
          } else if (onSelectPunchTarget) {
            onSelectPunchTarget(p.id);
          }
        },
      };
    }

    return null;
  };

  // Compute clickable loot handler (Rob at active player's position)
  const getRobChoice = (carIndex: number, floor: 'roof' | 'inside', lootType: LootType): ResolutionChoice | null => {
    if (!isMyDecision || !pendingActor || pendingDecision?.card.action !== 'rob') return null;
    if (pendingActor.position.car !== carIndex || pendingActor.position.floor !== floor) return null;
    return opts.find((o) => o.type === 'rob' && o.lootType === lootType) ?? null;
  };

  return (
    <div
      ref={stageRef}
      className={`train-stage ${animationsEnabled ? 'animated' : 'static'} ${camera.isZoomed ? 'is-camera-zoomed' : ''} ${activeClip ? 'is-cinematic-active' : ''}`}
    >
      <div
        ref={rigRef}
        className="train-camera-rig"
        style={camera.transform ? { transform: camera.transform } : undefined}
      >
        {/* Desert Sunset, Twilight Stars, Telegraph Line & Monument Valley Backdrop */}
        <div className="desert-backdrop" aria-hidden="true">
          <div className="desert-canyon-art" />
          <div className="desert-horizon-wash" />
          <svg className="desert-mesas" viewBox="0 0 1200 180" preserveAspectRatio="none">
            {/* Telegraph wire & poles across dusk sky */}
            <path d="M0,74 Q180,90 360,74 Q540,90 720,74 Q900,90 1080,74 L1200,82" fill="none" stroke="#240f0b" strokeWidth="1.2" opacity="0.65" />
            {[180, 540, 720, 900, 1080].map((px) => (
              <g key={px} opacity="0.65">
                <line x1={px} y1="72" x2={px} y2="152" stroke="#240f0b" strokeWidth="2.6" />
                <line x1={px - 8} y1="79" x2={px + 8} y2="79" stroke="#240f0b" strokeWidth="2.1" />
              </g>
            ))}
            {/* Foreground saguaro silhouettes along tracks */}
            <path d="M165,164 L165,126 M165,142 L156,142 L156,132 M165,137 L174,137 L174,128" stroke="#1e0b08" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M975,164 L975,124 M975,138 L966,138 L966,128 M975,132 L984,132 L984,124" stroke="#1e0b08" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M640,166 L640,140 M640,150 L633,150 L633,143" stroke="#1e0b08" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        <div className="train-scroll" ref={scrollRef}>
          <div className="train-track-row" ref={trackRowRef}>
            {game.train.map((car: TrainCarView, idx: number) => {
              const isCaboose = idx === game.train.length - 1;
              const roofPlayers = game.players.filter((p) => {
                const vpos = getVisualPlayerPosition(p, activeClip, clipPhase);
                return vpos.car === car.index && vpos.floor === 'roof';
              });
              const insidePlayers = game.players.filter((p) => {
                const vpos = getVisualPlayerPosition(p, activeClip, clipPhase);
                return vpos.car === car.index && vpos.floor === 'inside';
              });
              const isShotOrigin = !activeClip && anim.shotFx?.fromCar === car.index;
              const isShotTarget = !activeClip && anim.shotFx?.toCar === car.index;
              const roofZoneAct = getZoneAction(car.index, 'roof');
              const insideZoneAct = getZoneAction(car.index, 'inside');

              const renderActor = (p: PlayerView) => {
                const targetAct = getBanditTargetAction(p);
                const vpos = getVisualPlayerPosition(p, activeClip, clipPhase);
                const isShooterWindup =
                  activeClip?.type === 'shoot' &&
                  p.id === activeClip.shooterId &&
                  (clipPhase === 'windup' || clipPhase === 'travel');
                const isShotVictimImpact =
                  activeClip?.type === 'shoot' &&
                  p.id === activeClip.targetId &&
                  clipPhase === 'impact';
                const isPunchWindup =
                  activeClip?.type === 'punch' &&
                  p.id === activeClip.puncherId &&
                  clipPhase === 'windup';
                const isPunchStrike =
                  activeClip?.type === 'punch' &&
                  p.id === activeClip.puncherId &&
                  clipPhase === 'strike';
                const isPunchVictim =
                  activeClip?.type === 'punch' &&
                  p.id === activeClip.targetId &&
                  clipPhase === 'impact';
                const isMoving =
                  activeClip?.type === 'move' &&
                  p.id === activeClip.playerId &&
                  clipPhase === 'action';
                const isClimbing =
                  activeClip?.type === 'changeFloor' &&
                  p.id === activeClip.playerId &&
                  clipPhase === 'action';
                const isCinematicActor =
                  (activeClip?.type === 'shoot' && p.id === activeClip.shooterId) ||
                  (activeClip?.type === 'punch' && p.id === activeClip.puncherId) ||
                  ((activeClip?.type === 'move' ||
                    activeClip?.type === 'changeFloor' ||
                    activeClip?.type === 'rob') &&
                    p.id === activeClip.playerId);

                let actorFacing: 'left' | 'right' = vpos.car > 0 ? 'left' : 'right';
                if (activeClip?.type === 'shoot' && p.id === activeClip.shooterId) {
                  if (activeClip.targetStartPos.car < activeClip.from.car) actorFacing = 'left';
                  else if (activeClip.targetStartPos.car > activeClip.from.car) actorFacing = 'right';
                } else if (activeClip?.type === 'punch' && p.id === activeClip.puncherId) {
                  if (activeClip.victimFrom.car < activeClip.puncherPos.car) actorFacing = 'left';
                  else if (activeClip.victimFrom.car > activeClip.puncherPos.car) actorFacing = 'right';
                } else if (
                  activeClip?.type === 'move' &&
                  p.id === activeClip.playerId &&
                  activeClip.to.car !== activeClip.from.car
                ) {
                  actorFacing = activeClip.to.car < activeClip.from.car ? 'left' : 'right';
                }

                const classes = [
                  'actor-slot',
                  p.id === viewerId ? 'is-me' : '',
                  p.id === activePlayerId ? 'is-active' : '',
                  !p.connected ? 'is-offline' : '',
                  targetAct ? 'is-attack-target' : '',
                  targetAct?.selected ? 'is-selected-target' : '',
                  isCinematicActor ? 'fx-cinematic-focus' : '',
                  isShooterWindup ? 'fx-shoot-leap' : '',
                  isShotVictimImpact ? 'fx-victim-hit' : '',
                  isPunchWindup ? 'fx-punch-charge' : '',
                  isPunchStrike ? 'fx-punch-lunge' : '',
                  isPunchVictim ? 'fx-victim-punched' : '',
                  isMoving ? 'fx-move-dash' : '',
                  isClimbing ? 'fx-climb-vault' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <div
                    key={p.id}
                    data-actor-id={p.id}
                    className={classes}
                    role={targetAct ? 'button' : undefined}
                    tabIndex={targetAct ? 0 : undefined}
                    onClick={
                      targetAct
                        ? (ev) => {
                            ev.stopPropagation();
                            targetAct.onClick();
                          }
                        : undefined
                    }
                    onKeyDown={
                      targetAct
                        ? (ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault();
                              targetAct.onClick();
                            }
                          }
                        : undefined
                    }
                    title={`${p.name} (${p.character}) — ${t.bullets}: ${p.bulletsLeft}, ${t.hand}: ${p.handCount}`}
                  >
                    {targetAct && <span className="target-reticle-tag">{targetAct.label}</span>}
                    <CharacterSprite
                      character={p.character}
                      pose={anim.poses[p.id] ?? 'idle'}
                      size={42}
                      facing={actorFacing}
                    />
                    <span className="actor-tag">
                      {p.name}
                      {!p.connected ? ' ⚡' : ''}
                    </span>
                  </div>
                );
              };

            const renderLoot = (carIdx: number, floor: 'roof' | 'inside', loots: TrainCarView['roof']) =>
              loots.length > 0 && (
                <div className="loot-tray">
                  {loots.map((l) => {
                    const robChoice = getRobChoice(carIdx, floor, l.type);
                    if (robChoice && onSelectChoice) {
                      return (
                        <button
                          key={l.id}
                          type="button"
                          className="loot-target-btn"
                          title={`${t.robThis} ${l.type}`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onSelectChoice(robChoice);
                          }}
                        >
                          <LootToken type={l.type} value={l.value} size={24} />
                          <span className="loot-pick-tag">{t.robThis}</span>
                        </button>
                      );
                    }
                    return <LootToken key={l.id} type={l.type} value={l.value} size={22} />;
                  })}
                </div>
              );

            return (
              <div key={car.index} className="car-unit">
                {idx > 0 && (
                  <div className="car-coupler" aria-hidden="true">
                    <span className="coupler-bar" />
                  </div>
                )}

                <div className={`car-stage ${car.isLocomotive ? 'is-loco' : ''}`}>
                  {/* Steam Smoke on Locomotive */}
                  {car.isLocomotive && (
                    <div className="steam-plume" aria-hidden="true">
                      <span className="puff p1" />
                      <span className="puff p2" />
                      <span className="puff p3" />
                    </div>
                  )}

                  {/* SVG Cross-Section Architecture */}
                  {car.isLocomotive ? (
                    <LocomotiveBackdrop />
                  ) : (
                    <PassengerCarBackdrop index={car.index} isCaboose={isCaboose} />
                  )}

                  {/* Roof Interactive Layer */}
                  <div
                    className={`car-zone car-roof-zone ${roofZoneAct ? `is-target-zone target-${roofZoneAct.kind}` : ''}`}
                    role={roofZoneAct ? 'button' : undefined}
                    tabIndex={roofZoneAct ? 0 : undefined}
                    onClick={roofZoneAct?.onClick}
                    onKeyDown={
                      roofZoneAct
                        ? (ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault();
                              roofZoneAct.onClick();
                            }
                          }
                        : undefined
                    }
                  >
                    <div className="car-label">
                      {car.isLocomotive
                        ? t.locomotive
                        : isCaboose
                          ? `${t.car} ${car.index} (${t.caboose})`
                          : `${t.car} ${car.index}`}
                      {roofZoneAct && <span className="zone-target-pill">{roofZoneAct.label}</span>}
                    </div>
                    <div className="actor-row">{roofPlayers.map(renderActor)}</div>
                    {renderLoot(car.index, 'roof', car.roof)}
                  </div>

                  {/* Inside Cutaway Interactive Layer */}
                  <div
                    className={`car-zone car-inside-zone ${insideZoneAct ? `is-target-zone target-${insideZoneAct.kind}` : ''}`}
                    role={insideZoneAct ? 'button' : undefined}
                    tabIndex={insideZoneAct ? 0 : undefined}
                    onClick={insideZoneAct?.onClick}
                    onKeyDown={
                      insideZoneAct
                        ? (ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault();
                              insideZoneAct.onClick();
                            }
                          }
                        : undefined
                    }
                  >
                    {insideZoneAct && <span className="zone-target-pill zone-inside-pill">{insideZoneAct.label}</span>}
                    <div className="actor-row">
                      {effectiveMarshalCar === car.index && (
                        <div
                          data-actor-id="__marshal__"
                          className={[
                            'actor-slot marshal-slot',
                            anim.marshalPulse ? 'pulse' : '',
                            activeClip?.type === 'marshal' ? `fx-marshal-halo phase-${clipPhase ?? 'aura'}` : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          title="Marshal Samuel Ford"
                        >
                          <CharacterSprite
                            character="marshal"
                            pose={
                              activeClip?.type === 'marshal'
                                ? clipPhase === 'advance'
                                  ? 'move'
                                  : 'idle'
                                : anim.marshalPulse
                                  ? 'shoot'
                                  : 'idle'
                            }
                            facing={
                              activeClip?.type === 'marshal' &&
                              clipPhase === 'advance' &&
                              activeClip.toCar > activeClip.fromCar
                                ? 'right'
                                : 'left'
                            }
                            size={44}
                          />
                          <span className="actor-tag marshal-tag">
                            <MarshalBadge size={12} /> {t.marshalLabel}
                          </span>
                        </div>
                      )}
                      {insidePlayers.map(renderActor)}
                    </div>
                    {renderLoot(car.index, 'inside', car.inside)}
                  </div>

                  {isShotOrigin && <div className="fx-flash origin" />}
                  {isShotTarget && <div className="fx-flash target" />}
                </div>
              </div>
            );
          })}
            <ActionCinematicFx
              activeClip={activeClip}
              clipPhase={clipPhase}
              anchors={anchors}
              lang={lang}
            />
          </div>
          {/* Continuous Railway Ties & Steel Rail */}
          <div className="railway-bed" aria-hidden="true">
            <div className="steel-rail" />
            <div className="wooden-ties" />
          </div>
        </div>
      </div>

      {/* Floating Action Banner outside camera zoom */}
      {anim.banner && <div className="action-banner">{anim.banner}</div>}
    </div>
  );
}
