import type { GameState, PlayedCard, PlayerState, ResolutionChoice } from '@colt/shared';
import { GameError } from '@colt/shared';
import {
  changeFloorOptions,
  choiceEquals,
  marshalOptions,
  moveOptions,
  punchOptions,
  robOptions,
  shootOptions,
} from '@colt/game-rules';
import { logEvent } from './events.js';
import { addLoot, getPlayer, moveBandit, removeLootOfType } from './playerManager.js';
import { dropLootAt, moveMarshal, takeLootAt } from './trainManager.js';
import { transferBullet } from './cardManager.js';
import { applyPunchLootAbility, applyShootAbility } from './abilityManager.js';

/**
 * Action Manager: legal options (validation) + resolution for every action card.
 * Options are computed at resolution time from the current state (VERIFIED: choices
 * are made when the card is resolved, not when it is played).
 */

export function getActionOptions(state: GameState, played: PlayedCard): ResolutionChoice[] {
  const p = getPlayer(state, played.playerId);
  switch (played.card.action) {
    case 'move':
      return moveOptions(state, p);
    case 'changeFloor':
      return changeFloorOptions(state, p);
    case 'marshal':
      return marshalOptions(state);
    case 'rob':
      return robOptions(state, p);
    case 'shoot':
      return shootOptions(state, p);
    case 'punch':
      return punchOptions(state, p);
  }
}

/** Validates the choice against legal options then applies it. */
export function resolveAction(state: GameState, played: PlayedCard, choice: ResolutionChoice): void {
  const options = getActionOptions(state, played);
  if (!options.some((o) => choiceEquals(o, choice))) {
    throw new GameError('INVALID_CHOICE', `Illegal choice for ${played.card.action}`);
  }
  const p = getPlayer(state, played.playerId);
  switch (choice.type) {
    case 'move':
    case 'changeFloor': {
      const from = { ...p.position };
      moveBandit(state, p, choice.to);
      logEvent(
        state,
        choice.type === 'move' ? 'action.moved' : 'action.changedFloor',
        `${p.name} ${choice.type === 'move' ? 'moves' : 'climbs'} to car ${choice.to.car} (${choice.to.floor})`,
        { playerId: p.id, from, to: choice.to },
      );
      return;
    }
    case 'marshal':
      moveMarshal(state, choice.toCar);
      return;
    case 'rob': {
      const pos = { ...p.position };
      const loot = takeLootAt(state, p.position, choice.lootType);
      if (!loot) throw new GameError('INVALID_CHOICE', 'No such loot here');
      addLoot(p, loot);
      logEvent(state, 'action.robbed', `${p.name} grabs a ${loot.type}`, {
        playerId: p.id,
        lootId: loot.id,
        lootType: loot.type,
        pos,
      });
      return;
    }
    case 'shoot':
      return resolveShoot(state, p, getPlayer(state, choice.targetId));
    case 'punch':
      return resolvePunch(state, p, choice);
  }
}

function resolveShoot(state: GameState, shooter: PlayerState, target: PlayerState): void {
  const shooterPos = { ...shooter.position };
  const targetPos = { ...target.position };
  const bullet = transferBullet(shooter, target);
  if (!bullet) throw new GameError('INVALID_CHOICE', 'No bullets left');
  logEvent(state, 'action.shot', `${shooter.name} shoots ${target.name}`, {
    playerId: shooter.id,
    targetId: target.id,
    bulletId: bullet.id,
    from: shooterPos,
    targetPos,
  });
  applyShootAbility(state, shooter, target, shooterPos);
}

function resolvePunch(state: GameState, puncher: PlayerState, choice: Extract<ResolutionChoice, { type: 'punch' }>): void {
  const target = getPlayer(state, choice.targetId);
  const puncherPos = { ...puncher.position };
  const victimPos = { ...target.position };
  const toPos = choice.to ?? victimPos;
  let stolenByCheyenne = false;
  let droppedLootId: string | null = null;
  if (choice.lootType) {
    const loot = removeLootOfType(state, target, choice.lootType);
    if (loot) {
      droppedLootId = loot.id;
      if (applyPunchLootAbility(state, puncher, loot)) {
        stolenByCheyenne = true;
      } else {
        dropLootAt(state, victimPos, loot);
        logEvent(state, 'loot.dropped', `${target.name} drops a ${loot.type}`, {
          playerId: target.id,
          lootId: loot.id,
          lootType: loot.type,
          pos: victimPos,
        });
      }
    }
  }
  logEvent(state, 'action.punched', `${puncher.name} punches ${target.name}`, {
    playerId: puncher.id,
    targetId: target.id,
    puncherPos,
    from: victimPos,
    to: toPos,
    lootType: choice.lootType ?? null,
    lootId: droppedLootId,
    stolenByCheyenne,
  });
  if (choice.to) {
    moveBandit(state, target, choice.to);
    logEvent(state, 'action.moved', `${target.name} is knocked to car ${choice.to.car} (${choice.to.floor})`, {
      playerId: target.id,
      from: victimPos,
      to: choice.to,
      knocked: true,
    });
  }
}
