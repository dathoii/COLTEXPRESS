import type { CharacterId, LootType, Position } from '@colt/shared';
import type { SpriteId } from '../components/art/CharacterSprite.js';

export const CAR_LENGTH = 5.2;
export const CAR_GAP = 0.62;
export const CAR_PITCH = CAR_LENGTH + CAR_GAP;
export const CAR_WIDTH = 2.55;

export const LOCO_CAB_OFFSET_X = 1.38;

export const INSIDE_FLOOR_Y = 1.08;
export const ROOF_FLOOR_Y = 3.22;

export function carCenterX(carIdx: number, totalCars: number): number {
  const halfSpan = ((Math.max(1, totalCars) - 1) * CAR_PITCH) / 2;
  return carIdx * CAR_PITCH - halfSpan;
}

export function carInteriorCenterX(carIdx: number, totalCars: number): number {
  return carCenterX(carIdx, totalCars) + (carIdx === 0 ? LOCO_CAB_OFFSET_X : 0);
}

export function marshalHomeX(carIdx: number, totalCars: number): number {
  return carIdx === 0
    ? carCenterX(0, totalCars) + 0.56
    : carCenterX(carIdx, totalCars) - 0.85;
}

export function positionToWorld3D(
  pos: Position,
  totalCars: number,
  slotIndex = 0,
  slotCount = 1,
): { x: number; y: number; z: number } {
  const cx = carInteriorCenterX(pos.car, totalCars);
  const y = pos.floor === 'roof' ? ROOF_FLOOR_Y : INSIDE_FLOOR_Y;
  const maxCols = 3;
  const count = Math.max(1, slotCount);
  const col = slotIndex % maxCols;
  const row = Math.floor(slotIndex / maxCols);
  const colsInRow = Math.min(maxCols, count - row * maxCols);
  const colSpacing = pos.car === 0 ? 0.62 : 0.92;
  const offsetX = count === 1 ? 0 : (col - (colsInRow - 1) / 2) * colSpacing;
  const baseZ = pos.floor === 'roof' ? 0.1 : pos.car === 0 ? 0.08 : 0.25;
  const offsetZ = row > 0 ? (pos.car === 0 ? 0.34 : 0.42) : baseZ;
  return { x: cx + offsetX, y, z: offsetZ };
}

export const CHARACTER_3D_THEME: Record<
  SpriteId,
  {
    suit: number;
    coat: number;
    accent: number;
    hat: number;
    skin: number;
    emissive?: number;
  }
> = {
  django: { suit: 0x262638, coat: 0x383a56, accent: 0x8d52c9, hat: 0x1c1c28, skin: 0x7c4f33 },
  tuco: { suit: 0x56241b, coat: 0xc23e2b, accent: 0xf4b644, hat: 0x7d4c27, skin: 0xbd8159 },
  doc: { suit: 0x1d3454, coat: 0x2c6bb8, accent: 0xe6c87a, hat: 0x142236, skin: 0xe3b695 },
  cheyenne: { suit: 0x2a4e36, coat: 0x397a4f, accent: 0xd98f46, hat: 0x452815, skin: 0xc48b63 },
  ghost: { suit: 0x9aa2b3, coat: 0xe9eef8, accent: 0x9ad8ff, hat: 0xf2f5fc, skin: 0xe2e4ec, emissive: 0x26374d },
  belle: { suit: 0x622449, coat: 0xb93c87, accent: 0xffd782, hat: 0x8b2862, skin: 0xf0c7ab },
  marshal: { suit: 0x2e231c, coat: 0x8f673c, accent: 0xffd24c, hat: 0x4a311e, skin: 0xd7a885 },
};

export const CAR_BODY_COLORS = [
  0x241d19, // Locomotive matte iron
  0x2c4b3b, // Car 1: Hunter green
  0x6b3f24, // Car 2: Walnut amber
  0x35496b, // Car 3: Union navy
  0x6f2c27, // Car 4: Crimson parlor
  0x4a3b58, // Car 5: Imperial plum
  0x7a2b24, // Car 6 / Caboose crimson
];

export const LOOT_3D_STYLE: Record<LootType, { color: number; metalness: number; roughness: number }> = {
  purse: { color: 0xcfa05a, metalness: 0.1, roughness: 0.78 },
  jewel: { color: 0xe82147, metalness: 0.35, roughness: 0.18 },
  strongbox: { color: 0x2f684c, metalness: 0.55, roughness: 0.38 },
};

export function isPlayerCharacterId(id: string): id is CharacterId {
  return (
    id === 'django' ||
    id === 'tuco' ||
    id === 'doc' ||
    id === 'cheyenne' ||
    id === 'ghost' ||
    id === 'belle'
  );
}
