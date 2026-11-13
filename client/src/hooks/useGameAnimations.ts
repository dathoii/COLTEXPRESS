import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameEvent, GameView, LootType, Position, RoundEventId } from '@colt/shared';
import type { CharacterPose } from '../components/art/CharacterSprite.js';
import { soundManager } from '../audio/soundManager.js';

export interface ActiveShotFx {
  id: number;
  fromCar: number;
  toCar: number;
  floor: 'inside' | 'roof';
}

export type ClipPhase =
  | 'windup'
  | 'travel'
  | 'strike'
  | 'impact'
  | 'focus'
  | 'action'
  | 'aura'
  | 'zoom'
  | 'advance'
  | 'rob'
  | 'eventStart'
  | 'eventImpact';

export interface ShootActionClip {
  id: number;
  type: 'shoot';
  durationMs: number;
  shooterId: string;
  targetId: string;
  from: Position;
  targetStartPos: Position;
  targetEndPos: Position;
  banner: string;
}

export interface PunchActionClip {
  id: number;
  type: 'punch';
  durationMs: number;
  puncherId: string;
  targetId: string;
  puncherPos: Position;
  victimFrom: Position;
  victimTo: Position;
  lootType: LootType | null;
  stolenByCheyenne: boolean;
  banner: string;
}

export interface MoveActionClip {
  id: number;
  type: 'move' | 'changeFloor';
  durationMs: number;
  playerId: string;
  from: Position;
  to: Position;
  banner: string;
}

export interface MarshalActionClip {
  id: number;
  type: 'marshal';
  durationMs: number;
  fromCar: number;
  toCar: number;
  caughtIds: string[];
  banner: string;
}

export interface RobActionClip {
  id: number;
  type: 'rob';
  durationMs: number;
  playerId: string;
  pos: Position;
  lootType: LootType;
  banner: string;
}

export interface EventMoveEntry {
  playerId?: string;
  isMarshal?: boolean;
  from: Position;
  to: Position;
}

export interface EventActorEntry {
  playerId: string;
  pos?: Position;
  lootType?: LootType;
  amount?: number;
}

export interface RoundEventActionClip {
  id: number;
  type: 'event';
  durationMs: number;
  eventId: RoundEventId;
  car?: number;
  moves: EventMoveEntry[];
  shots: EventActorEntry[];
  drops: EventActorEntry[];
  gains: EventActorEntry[];
  banner: string;
}

export type ActionClip =
  | ShootActionClip
  | PunchActionClip
  | MoveActionClip
  | MarshalActionClip
  | RobActionClip
  | RoundEventActionClip;

export interface GameAnimationState {
  poses: Record<string, CharacterPose>;
  shotFx: ActiveShotFx | null;
  banner: string | null;
  marshalPulse: boolean;
  activeClip: ActionClip | null;
  clipPhase: ClipPhase | null;
  /** Normalized 0..1 elapsed progress of the currently playing clip. */
  progress: number;
}

const CLIP_DURATIONS = {
  shoot: 1520,
  punch: 1460,
  move: 920,
  changeFloor: 900,
  marshal: 1480,
  rob: 820,
  event: 1620,
} as const;

const IDLE_STATE: GameAnimationState = {
  poses: {},
  shotFx: null,
  banner: null,
  marshalPulse: false,
  activeClip: null,
  clipPhase: null,
  progress: 0,
};

function readPos(val: unknown): Position | null {
  if (!val || typeof val !== 'object') return null;
  const obj = val as Record<string, unknown>;
  if (typeof obj.car !== 'number') return null;
  if (obj.floor !== 'inside' && obj.floor !== 'roof') return null;
  return { car: obj.car, floor: obj.floor };
}

function readActorList(raw: unknown): EventActorEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: EventActorEntry[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      out.push({ playerId: item });
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      if (typeof o.playerId === 'string') {
        const lt = o.lootType;
        out.push({
          playerId: o.playerId,
          pos: readPos(o.pos) ?? readPos(o.to) ?? readPos(o.from) ?? undefined,
          lootType: lt === 'purse' || lt === 'jewel' || lt === 'strongbox' ? lt : undefined,
          amount: typeof o.amount === 'number' ? o.amount : undefined,
        });
      }
    }
  }
  return out;
}

function readMoveList(raw: unknown): EventMoveEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: EventMoveEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const from = readPos(o.from);
    const to = readPos(o.to);
    if (from && to) {
      out.push({
        playerId: typeof o.playerId === 'string' ? o.playerId : undefined,
        isMarshal: Boolean(o.isMarshal),
        from,
        to,
      });
    }
  }
  return out;
}

function getClipPhase(clip: ActionClip, elapsedMs: number, durationMs: number): ClipPhase {
  const r = durationMs > 0 ? elapsedMs / durationMs : 1;
  switch (clip.type) {
    case 'shoot': {
      if (r < 0.31) return 'windup';
      if (r < 0.66) return 'travel';
      return 'impact';
    }
    case 'punch': {
      if (r < 0.31) return 'windup';
      if (r < 0.68) return 'strike';
      return 'impact';
    }
    case 'move':
    case 'changeFloor': {
      return r < 0.34 ? 'focus' : 'action';
    }
    case 'marshal': {
      if (r < 0.31) return 'aura';
      if (r < 0.62) return 'zoom';
      return 'advance';
    }
    case 'rob': {
      return 'rob';
    }
    case 'event': {
      return r < 0.42 ? 'eventStart' : 'eventImpact';
    }
  }
}

function buildClipsFromBatch(
  events: GameEvent[],
  game: GameView,
  nextId: () => number,
): ActionClip[] {
  const clips: ActionClip[] = [];
  const consumedSeqs = new Set<number>();

  const findPlayerPos = (id: string): Position => {
    const p = game.players.find((pl) => pl.id === id);
    return p ? { ...p.position } : { car: 1, floor: 'inside' };
  };

  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i];
    if (!ev || consumedSeqs.has(ev.seq)) continue;
    const data = (ev.data ?? {}) as Record<string, unknown>;

    if (ev.type === 'action.shot') {
      const shooterId = typeof data.playerId === 'string' ? data.playerId : '';
      const targetId = typeof data.targetId === 'string' ? data.targetId : '';
      if (!shooterId || !targetId) continue;

      const from = readPos(data.from) ?? readPos(data.pos) ?? findPlayerPos(shooterId);
      const targetStartPos = readPos(data.targetPos) ?? findPlayerPos(targetId);
      let targetEndPos = targetStartPos;

      // Absorb Django push from the immediately following ability.used event.
      for (let j = i + 1; j < events.length && j <= i + 4; j += 1) {
        const nextEv = events[j];
        if (!nextEv || nextEv.type !== 'ability.used') continue;
        const nd = (nextEv.data ?? {}) as Record<string, unknown>;
        if (nd.ability === 'django' && nd.targetId === targetId) {
          targetEndPos = readPos(nd.to) ?? findPlayerPos(targetId);
          consumedSeqs.add(nextEv.seq);
          break;
        }
      }

      clips.push({
        id: nextId(),
        type: 'shoot',
        durationMs: CLIP_DURATIONS.shoot,
        shooterId,
        targetId,
        from,
        targetStartPos,
        targetEndPos,
        banner: ev.message,
      });
      continue;
    }

    if (ev.type === 'action.punched') {
      const puncherId = typeof data.playerId === 'string' ? data.playerId : '';
      const targetId = typeof data.targetId === 'string' ? data.targetId : '';
      if (!puncherId || !targetId) continue;

      const puncherPos = readPos(data.puncherPos) ?? findPlayerPos(puncherId);
      const victimFrom = readPos(data.from) ?? findPlayerPos(targetId);
      let victimTo = readPos(data.to) ?? findPlayerPos(targetId);
      const rawLootType = data.lootType;
      const lootType: LootType | null =
        rawLootType === 'purse' || rawLootType === 'jewel' || rawLootType === 'strongbox'
          ? rawLootType
          : null;
      let stolenByCheyenne = Boolean(data.stolenByCheyenne);

      // Absorb victim knockback action.moved and Cheyenne ability.used / loot.dropped in same beat.
      for (let j = i + 1; j < events.length && j <= i + 5; j += 1) {
        const nextEv = events[j];
        if (!nextEv) continue;
        const nd = (nextEv.data ?? {}) as Record<string, unknown>;
        if (nextEv.type === 'action.moved' && nd.playerId === targetId) {
          victimTo = readPos(nd.to) ?? victimTo;
          consumedSeqs.add(nextEv.seq);
        } else if (nextEv.type === 'ability.used' && nd.ability === 'cheyenne') {
          stolenByCheyenne = true;
          consumedSeqs.add(nextEv.seq);
        } else if (nextEv.type === 'loot.dropped' && nd.playerId === targetId) {
          consumedSeqs.add(nextEv.seq);
        }
      }

      clips.push({
        id: nextId(),
        type: 'punch',
        durationMs: CLIP_DURATIONS.punch,
        puncherId,
        targetId,
        puncherPos,
        victimFrom,
        victimTo,
        lootType,
        stolenByCheyenne,
        banner: ev.message,
      });
      continue;
    }

    if (ev.type === 'action.marshalMoved') {
      const fromCar = typeof data.from === 'number' ? data.from : game.marshalCar;
      const toCar = typeof data.to === 'number' ? data.to : game.marshalCar;
      const caughtIds: string[] = [];

      for (let j = i + 1; j < events.length && j <= i + 8; j += 1) {
        const nextEv = events[j];
        if (!nextEv) break;
        if (nextEv.type === 'marshal.hit') {
          const nd = (nextEv.data ?? {}) as Record<string, unknown>;
          if (typeof nd.playerId === 'string') {
            caughtIds.push(nd.playerId);
          }
          consumedSeqs.add(nextEv.seq);
        } else if (nextEv.type === 'action.changedFloor') {
          const nd = (nextEv.data ?? {}) as Record<string, unknown>;
          if (typeof nd.playerId === 'string' && caughtIds.includes(nd.playerId)) {
            consumedSeqs.add(nextEv.seq);
          } else {
            break;
          }
        } else {
          break;
        }
      }

      clips.push({
        id: nextId(),
        type: 'marshal',
        durationMs: CLIP_DURATIONS.marshal,
        fromCar,
        toCar,
        caughtIds,
        banner: ev.message,
      });
      continue;
    }

    if (ev.type === 'marshal.hit') {
      const pid = typeof data.playerId === 'string' ? data.playerId : '';
      if (!pid) continue;
      const car = typeof data.car === 'number' ? data.car : game.marshalCar;
      clips.push({
        id: nextId(),
        type: 'marshal',
        durationMs: 1120,
        fromCar: car,
        toCar: car,
        caughtIds: [pid],
        banner: ev.message,
      });
      continue;
    }

    if (ev.type === 'action.moved' || ev.type === 'action.changedFloor') {
      const playerId = typeof data.playerId === 'string' ? data.playerId : '';
      if (!playerId) continue;
      const to = readPos(data.to) ?? findPlayerPos(playerId);
      const from = readPos(data.from) ?? to;

      clips.push({
        id: nextId(),
        type: ev.type === 'action.changedFloor' ? 'changeFloor' : 'move',
        durationMs:
          ev.type === 'action.changedFloor' ? CLIP_DURATIONS.changeFloor : CLIP_DURATIONS.move,
        playerId,
        from,
        to,
        banner: ev.message,
      });
      continue;
    }

    if (ev.type === 'action.robbed') {
      const playerId = typeof data.playerId === 'string' ? data.playerId : '';
      if (!playerId) continue;
      const rawLoot = data.lootType;
      const lootType: LootType =
        rawLoot === 'jewel' || rawLoot === 'strongbox' ? rawLoot : 'purse';

      clips.push({
        id: nextId(),
        type: 'rob',
        durationMs: CLIP_DURATIONS.rob,
        playerId,
        pos: readPos(data.pos) ?? findPlayerPos(playerId),
        lootType,
        banner: ev.message,
      });
      continue;
    }

    if (ev.type === 'round.event') {
      const eventId = (typeof data.eventId === 'string' ? data.eventId : 'none') as RoundEventId;
      if (eventId === 'none') continue;

      const moves = readMoveList(data.moves);
      const shots = readActorList(data.shots);
      const drops = readActorList(data.drops);
      const gains = readActorList(data.gains);
      const car = typeof data.car === 'number' ? data.car : undefined;

      // Consume follow-up marshal.hit events emitted as side-effects of angryMarshal
      for (let j = i + 1; j < events.length && j <= i + 6; j += 1) {
        const nextEv = events[j];
        if (!nextEv) break;
        if (nextEv.type === 'marshal.hit') {
          const nd = (nextEv.data ?? {}) as Record<string, unknown>;
          if (typeof nd.playerId === 'string' && !shots.some((s) => s.playerId === nd.playerId)) {
            shots.push({ playerId: nd.playerId });
          }
          consumedSeqs.add(nextEv.seq);
        } else {
          break;
        }
      }

      clips.push({
        id: nextId(),
        type: 'event',
        durationMs: CLIP_DURATIONS.event,
        eventId,
        car,
        moves,
        shots,
        drops,
        gains,
        banner: ev.message,
      });
    }
  }

  return clips;
}

function playPhaseAudio(clip: ActionClip, phase: ClipPhase): void {
  switch (clip.type) {
    case 'shoot':
      if (phase === 'windup') soundManager.playSfx('emptyClick', 0.55);
      else if (phase === 'travel') soundManager.playSfx('shoot', 1.0);
      break;
    case 'punch':
      if (phase === 'strike') soundManager.playSfx('punch', 1.0);
      else if (phase === 'impact' && clip.lootType) soundManager.playSfx('robCoin', 0.72);
      break;
    case 'move':
      if (phase === 'action') soundManager.playSfx('move', 0.88);
      break;
    case 'changeFloor':
      if (phase === 'action') soundManager.playSfx('climb', 0.9);
      break;
    case 'rob':
      if (phase === 'rob') {
        soundManager.playSfx(clip.lootType === 'strongbox' ? 'robSack' : 'robCoin', 0.95);
      }
      break;
    case 'marshal':
      if (phase === 'aura') soundManager.playSfx('marshal', 0.95);
      else if (phase === 'advance' && clip.caughtIds.length > 0) soundManager.playSfx('shoot', 0.9);
      break;
    case 'event':
      if (phase === 'eventStart') {
        if (clip.eventId === 'angryMarshal' || clip.eventId === 'marshalsRevenge') {
          soundManager.playSfx('marshal', 0.95);
        } else {
          soundManager.playSfx('turnBell', 0.85);
        }
      } else if (phase === 'eventImpact') {
        if (clip.shots.length > 0 || clip.eventId === 'passengersRebellion') {
          soundManager.playSfx('shoot', 0.92);
        } else if (clip.gains.length > 0 || clip.eventId === 'takeItAll') {
          soundManager.playSfx('robSack', 0.9);
        } else if (clip.moves.length > 0) {
          soundManager.playSfx('move', 0.9);
        }
      }
      break;
  }
}

export function useGameAnimations(
  game: GameView | null,
  enabled = true,
): GameAnimationState {
  const gameIdRef = useRef<string | null>(null);
  const lastSeqRef = useRef<number | null>(null);
  const nextClipIdRef = useRef(1);
  const queueRef = useRef<ActionClip[]>([]);
  const clipStartRef = useRef<number>(0);
  const clipDurRef = useRef<number>(1000);
  const lastSfxMarkRef = useRef<string>('');

  const [activeClip, setActiveClip] = useState<ActionClip | null>(null);
  const [clipPhase, setClipPhase] = useState<ClipPhase | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const computeEffectiveDuration = (baseMs: number, queuedCount: number): number => {
    const scale = queuedCount > 10 ? 0.58 : queuedCount > 5 ? 0.74 : 1;
    return Math.round(baseMs * scale);
  };

  // Reset queue & tracking when leaving a game or restarting a fresh match.
  useEffect(() => {
    if (!game) {
      gameIdRef.current = null;
      lastSeqRef.current = null;
      queueRef.current = [];
      setActiveClip(null);
      setClipPhase(null);
      setProgress(0);
      return;
    }
    if (gameIdRef.current !== null && gameIdRef.current !== game.id) {
      lastSeqRef.current = null;
      queueRef.current = [];
      setActiveClip(null);
      setClipPhase(null);
      setProgress(0);
    }
    gameIdRef.current = game.id;
    if (!enabled) {
      queueRef.current = [];
      setActiveClip(null);
      setClipPhase(null);
      setProgress(0);
    }
  }, [game, enabled]);

  // Enqueue ALL new action & round-event clips cleanly without dropping events.
  useEffect(() => {
    if (!game) return;
    const logs = game.log ?? [];
    const lastEv = logs[logs.length - 1];
    if (!lastEv) {
      lastSeqRef.current = 0;
      return;
    }

    const latestSeq = lastEv.seq;
    if (lastSeqRef.current === null) {
      lastSeqRef.current = latestSeq;
      return;
    }

    if (latestSeq < lastSeqRef.current) {
      lastSeqRef.current = 0;
    }

    const fresh = logs.filter((ev) => ev.seq > (lastSeqRef.current ?? 0));
    if (fresh.length === 0) return;
    lastSeqRef.current = latestSeq;

    if (!enabled) return;

    const newClips = buildClipsFromBatch(fresh, game, () => {
      const id = nextClipIdRef.current;
      nextClipIdRef.current += 1;
      return id;
    });
    if (newClips.length === 0) return;

    // Preserve full chronological replay queue (generous ceiling of 64 to guard runaway reconnect floods).
    const combined = [...queueRef.current, ...newClips];
    queueRef.current = combined.length > 64 ? combined.slice(-64) : combined;

    if (!activeClip && queueRef.current.length > 0) {
      const head = queueRef.current.shift() ?? null;
      if (head) {
        clipStartRef.current = performance.now();
        clipDurRef.current = computeEffectiveDuration(head.durationMs, queueRef.current.length);
        const phase = getClipPhase(head, 0, clipDurRef.current);
        setActiveClip(head);
        setClipPhase(phase);
        setProgress(0);
        const mark = `${head.id}:${phase}`;
        if (lastSfxMarkRef.current !== mark) {
          lastSfxMarkRef.current = mark;
          playPhaseAudio(head, phase);
        }
      }
    }
  }, [game, enabled, activeClip]);

  // Drive clip phase progression & normalized timeline progress cleanly.
  useEffect(() => {
    if (!activeClip || !enabled) return;

    const step = () => {
      const dur = clipDurRef.current;
      const elapsed = performance.now() - clipStartRef.current;
      if (elapsed >= dur) {
        const next = queueRef.current.shift() ?? null;
        if (next) {
          clipStartRef.current = performance.now();
          clipDurRef.current = computeEffectiveDuration(next.durationMs, queueRef.current.length);
          const nextPhase = getClipPhase(next, 0, clipDurRef.current);
          setActiveClip(next);
          setClipPhase(nextPhase);
          setProgress(0);
          const mark = `${next.id}:${nextPhase}`;
          if (lastSfxMarkRef.current !== mark) {
            lastSfxMarkRef.current = mark;
            playPhaseAudio(next, nextPhase);
          }
        } else {
          setActiveClip(null);
          setClipPhase(null);
          setProgress(0);
        }
        return;
      }
      const nextPhase = getClipPhase(activeClip, elapsed, dur);
      const nextProg = Math.max(0, Math.min(1, elapsed / dur));
      setProgress(nextProg);
      setClipPhase((prev) => {
        if (prev !== nextPhase) {
          const mark = `${activeClip.id}:${nextPhase}`;
          if (lastSfxMarkRef.current !== mark) {
            lastSfxMarkRef.current = mark;
            playPhaseAudio(activeClip, nextPhase);
          }
          return nextPhase;
        }
        return prev;
      });
    };

    const timer = window.setInterval(step, 32);
    return () => window.clearInterval(timer);
  }, [activeClip, enabled]);

  return useMemo<GameAnimationState>(() => {
    if (!enabled || !activeClip || !clipPhase) return IDLE_STATE;

    const poses: Record<string, CharacterPose> = {};
    let shotFx: ActiveShotFx | null = null;
    let marshalPulse = false;

    if (activeClip.type === 'shoot') {
      poses[activeClip.shooterId] = 'shoot';
      if (clipPhase === 'impact') {
        poses[activeClip.targetId] = 'hit';
      }
      if (clipPhase === 'travel' || clipPhase === 'impact') {
        shotFx = {
          id: activeClip.id,
          fromCar: activeClip.from.car,
          toCar: activeClip.targetStartPos.car,
          floor: activeClip.from.floor,
        };
      }
    } else if (activeClip.type === 'punch') {
      poses[activeClip.puncherId] = 'punch';
      if (clipPhase === 'impact') {
        poses[activeClip.targetId] = 'hit';
      }
    } else if (activeClip.type === 'move') {
      poses[activeClip.playerId] = 'move';
    } else if (activeClip.type === 'changeFloor') {
      poses[activeClip.playerId] = 'climb';
    } else if (activeClip.type === 'rob') {
      poses[activeClip.playerId] = 'rob';
    } else if (activeClip.type === 'marshal') {
      marshalPulse = true;
      if (clipPhase === 'advance') {
        for (const cid of activeClip.caughtIds) {
          poses[cid] = 'hit';
        }
      }
    } else if (activeClip.type === 'event') {
      if (activeClip.eventId === 'angryMarshal' || activeClip.eventId === 'marshalsRevenge') {
        marshalPulse = true;
      }
      if (clipPhase === 'eventImpact') {
        for (const s of activeClip.shots) poses[s.playerId] = 'hit';
        for (const m of activeClip.moves) {
          if (m.playerId) poses[m.playerId] = 'move';
        }
        for (const g of activeClip.gains) poses[g.playerId] = 'rob';
      }
    }

    return {
      poses,
      shotFx,
      banner: activeClip.banner,
      marshalPulse,
      activeClip,
      clipPhase,
      progress,
    };
  }, [enabled, activeClip, clipPhase, progress]);
}
