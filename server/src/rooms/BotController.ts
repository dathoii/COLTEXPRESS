import type { ActionCard, BotDifficulty, CharacterId, GameState, PlayerState, ResolutionChoice } from '@colt/shared';
import { CHARACTERS, mayPlayFaceDown, punchOptions, robOptions, shootOptions } from '@colt/game-rules';
import type { ActiveRoom, RoomManager } from './RoomManager.js';
import type { RoomBroadcaster } from '../multiplayer/socketServer.js';
import { createLogger } from '../logger.js';

const log = createLogger('bot');

const BOT_NAMES = ['Billy AI', 'Jesse AI', 'Calamity AI', 'Wyatt AI', 'Butch AI', 'Annie AI'];

export function pickBotIdentity(
  existingNames: string[],
  takenChars: Array<CharacterId | null>,
  preferredChar?: CharacterId,
): { name: string; character: CharacterId } {
  const used = new Set(existingNames.map((n) => n.toLowerCase()));
  const name = BOT_NAMES.find((n) => !used.has(n.toLowerCase())) ?? `Outlaw Bot ${existingNames.length + 1}`;
  const available = CHARACTERS.filter((c) => !takenChars.includes(c));
  const character =
    preferredChar && available.includes(preferredChar) ? preferredChar : available[0]!;
  return { name, character };
}

function lootScore(type: 'purse' | 'jewel' | 'strongbox'): number {
  if (type === 'strongbox') return 1000;
  if (type === 'jewel') return 500;
  return 320;
}

export function pickBotPlanningAction(
  state: GameState,
  bot: PlayerState,
): { kind: 'play'; cardId: string; faceDown: boolean } | { kind: 'draw' } {
  const actionCards = bot.hand.filter((c): c is ActionCard => c.kind === 'action');
  if (actionCards.length === 0) {
    return { kind: 'draw' };
  }
  const difficulty: BotDifficulty = bot.botDifficulty ?? 'normal';
  const round = state.roundDeck[state.roundIndex];
  const turnType = round?.turns[state.planning?.turnIndex ?? 0] ?? 'normal';
  const stepsTaken = state.planning?.stepsTaken ?? 0;

  if (difficulty === 'easy') {
    if (bot.deck.length > 0 && actionCards.length <= 1 && Math.random() < 0.35) {
      return { kind: 'draw' };
    }
    const card = actionCards[Math.floor(Math.random() * actionCards.length)]!;
    const faceDown = mayPlayFaceDown(bot.character, state.planning?.turnIndex ?? 0, turnType, stepsTaken) && Math.random() < 0.5;
    return { kind: 'play', cardId: card.id, faceDown };
  }

  // Normal tactical heuristic: score each candidate card by current board state
  let bestCard = actionCards[0]!;
  let bestScore = -1;
  const robsNow = robOptions(state, bot).length;
  const shootsNow = shootOptions(state, bot).length;
  const punchesNow = punchOptions(state, bot).length;

  for (const c of actionCards) {
    let score = 20;
    if (c.action === 'rob') {
      score = robsNow > 0 ? 90 : 35;
    } else if (c.action === 'shoot') {
      score = bot.bullets.length > 0 ? (shootsNow > 0 ? 78 : 48) : 5;
    } else if (c.action === 'punch') {
      score = punchesNow > 0 ? 85 : 25;
    } else if (c.action === 'move') {
      score = robsNow === 0 ? 72 : 42;
    } else if (c.action === 'changeFloor') {
      score = bot.position.floor === 'inside' && robsNow === 0 ? 55 : 44;
    } else if (c.action === 'marshal') {
      score = 40;
    }
    // Tiny deterministic noise by card id length / position to vary play
    score += Math.random() * 8;
    if (score > bestScore) {
      bestScore = score;
      bestCard = c;
    }
  }

  const faceDown =
    mayPlayFaceDown(bot.character, state.planning?.turnIndex ?? 0, turnType, stepsTaken) && Math.random() < 0.7;
  return { kind: 'play', cardId: bestCard.id, faceDown };
}

export function pickBotExecutionChoice(
  state: GameState,
  bot: PlayerState,
  options: ResolutionChoice[],
): ResolutionChoice {
  if (options.length <= 1) return options[0]!;
  const difficulty: BotDifficulty = bot.botDifficulty ?? 'normal';
  if (difficulty === 'easy') {
    return options[Math.floor(Math.random() * options.length)]!;
  }

  let best = options[0]!;
  let bestScore = -10_000;

  for (const opt of options) {
    let score = 0;
    switch (opt.type) {
      case 'rob':
        score = lootScore(opt.lootType);
        break;
      case 'shoot': {
        const victim = state.players.find((p) => p.id === opt.targetId);
        score = 500 + (victim?.loot.length ?? 0) * 140;
        break;
      }
      case 'punch': {
        const lootPts = opt.lootType ? lootScore(opt.lootType) : 0;
        const knockIntoMarshal = opt.to && opt.to.floor === 'inside' && opt.to.car === state.marshalCar ? 250 : 0;
        score = 350 + lootPts + knockIntoMarshal;
        break;
      }
      case 'move': {
        const car = state.train[opt.to.car];
        const carLoot = car
          ? (opt.to.floor === 'inside' ? car.inside : car.roof).reduce((s, l) => s + lootScore(l.type), 0)
          : 0;
        const marshalPenalty = opt.to.floor === 'inside' && opt.to.car === state.marshalCar ? -900 : 0;
        score = carLoot + marshalPenalty;
        break;
      }
      case 'changeFloor': {
        const car = state.train[opt.to.car];
        const carLoot = car
          ? (opt.to.floor === 'inside' ? car.inside : car.roof).reduce((s, l) => s + lootScore(l.type), 0)
          : 0;
        const marshalPenalty = opt.to.floor === 'inside' && opt.to.car === state.marshalCar ? -900 : 0;
        score = carLoot + marshalPenalty;
        break;
      }
      case 'marshal': {
        const victims = state.players.filter((p) => p.id !== bot.id && p.position.car === opt.toCar && p.position.floor === 'inside').length;
        const selfHit = bot.position.car === opt.toCar && bot.position.floor === 'inside' ? -1000 : 0;
        score = victims * 400 + selfHit;
        break;
      }
    }
    score += Math.random() * 12;
    if (score > bestScore) {
      bestScore = score;
      best = opt;
    }
  }
  return best;
}

export interface RoomAutomationController {
  schedule: (room: ActiveRoom) => void;
  stop: () => void;
}

export function createRoomAutomation(
  rooms: RoomManager,
  getBroadcaster: () => RoomBroadcaster | undefined,
  idlePruneMs: number,
): RoomAutomationController {
  const pendingBotTimers = new Map<string, NodeJS.Timeout>();
  let closed = false;

  const clearRoomTimer = (code: string) => {
    const t = pendingBotTimers.get(code);
    if (t) {
      clearTimeout(t);
      pendingBotTimers.delete(code);
    }
  };

  const runBotStep = (code: string) => {
    pendingBotTimers.delete(code);
    if (closed) return;
    let room: ActiveRoom;
    try {
      room = rooms.getRoom(code);
    } catch {
      return;
    }
    if (room.info.closed || room.info.paused) return;

    const state = room.engine.state;
    const activeId = room.engine.activePlayerId();
    if (!activeId) return;
    const activePlayer = state.players.find((p) => p.id === activeId);
    if (!activePlayer?.isBot) return;

    try {
      if (state.phase === 'planning') {
        const move = pickBotPlanningAction(state, activePlayer);
        if (move.kind === 'play') {
          room.engine.playCard(activeId, move.cardId, move.faceDown);
        } else {
          room.engine.drawCards(activeId);
        }
      } else if (state.phase === 'execution' && state.execution?.pending?.playerId === activeId) {
        const choice = pickBotExecutionChoice(state, activePlayer, state.execution.pending.options);
        room.engine.resolve(activeId, choice);
      }
      rooms.refreshTurnDeadline(room);
      rooms.persist(room);
      getBroadcaster()?.broadcastRoom(room);
      schedule(room);
    } catch (err) {
      log.warn(`Bot step failed in ${code}`, err);
    }
  };

  const schedule = (room: ActiveRoom) => {
    if (closed || room.info.closed || room.info.paused) {
      clearRoomTimer(room.info.code);
      return;
    }
    const activeId = room.engine.activePlayerId();
    if (!activeId) {
      clearRoomTimer(room.info.code);
      return;
    }
    const state = room.engine.state;
    const isBotTurn = Boolean(state.players.find((p) => p.id === activeId)?.isBot);
    if (!isBotTurn) {
      clearRoomTimer(room.info.code);
      return;
    }
    if (pendingBotTimers.has(room.info.code)) return;
    const timer = setTimeout(() => runBotStep(room.info.code), 520);
    pendingBotTimers.set(room.info.code, timer);
  };

  const interval = setInterval(() => {
    if (closed) return;
    const now = Date.now();
    // 1. Check expired human turn timers
    for (const room of rooms.listRooms()) {
      if (room.info.closed || room.info.paused) continue;
      if (room.info.turnDeadlineAt && now >= room.info.turnDeadlineAt) {
        const activeId = room.engine.activePlayerId();
        if (!activeId) continue;
        const st = room.engine.state;
        const player = st.players.find((p) => p.id === activeId);
        if (!player || player.isBot) continue;
        try {
          if (st.phase === 'planning') {
            const firstAct = player.hand.find((c): c is ActionCard => c.kind === 'action');
            if (firstAct) room.engine.playCard(activeId, firstAct.id, false);
            else if (player.deck.length > 0) room.engine.drawCards(activeId);
          } else if (st.phase === 'execution' && st.execution?.pending?.playerId === activeId) {
            const opt = st.execution.pending.options[0];
            if (opt) room.engine.resolve(activeId, opt);
          }
          rooms.refreshTurnDeadline(room);
          rooms.persist(room);
          getBroadcaster()?.broadcastRoom(room);
          schedule(room);
        } catch (err) {
          log.warn(`Turn timeout fallback failed in ${room.info.code}`, err);
        }
      }
    }

    // 2. Clean up long-abandoned rooms cleanly
    if (idlePruneMs > 0) {
      const expired = rooms.pruneIdleRooms(idlePruneMs, now);
      for (const code of expired) {
        clearRoomTimer(code);
        getBroadcaster()?.broadcastClosed(code, 'Room closed due to inactivity');
      }
    }
  }, 1000);
  interval.unref();

  return {
    schedule,
    stop: () => {
      closed = true;
      clearInterval(interval);
      for (const t of pendingBotTimers.values()) clearTimeout(t);
      pendingBotTimers.clear();
    },
  };
}
