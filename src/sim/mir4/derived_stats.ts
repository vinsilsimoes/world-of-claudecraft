// Pure MIR4 character-stat projection shared by the authoritative combat
// entity and the existing character-sheet provider. Combat Power follows the
// source COMBATPOINT table: sum effective STATUS * class weight, then divide
// by 10,000. The projection contains no host or UI state.

import { mir4LevelRow } from '../content/mir4';
import type { Mir4ClassId } from '../content/mir4/classes';
import { aggregateMir4PassiveBonuses } from '../content/mir4/passives';
import type { Mir4Equipment, Mir4EquipmentInstanceState } from './equipment';
import { mir4EquippedAttributes } from './equipment';
import { type Mir4MountState, mir4MountBonuses } from './mounts';
import { type Mir4SpiritState, mir4SpiritBonuses } from './spirits';

const LEVEL_STATUS_COLUMNS = {
  1: 3,
  6: 4,
  19: 20,
  20: 5,
  22: 6,
  24: 7,
  26: 8,
  28: 9,
  29: 10,
  30: 11,
  31: 12,
  32: 13,
  38: 16,
  41: 14,
  43: 15,
} as const;

const COMMON_COMBAT_POWER_WEIGHTS = new Map<number, number>([
  [1, 3_000],
  [6, 9_000],
  [24, 30_000],
  [26, 30_000],
  [28, 20_000],
  [29, 20_000],
  [30, 10_000],
  [31, 10_000],
  [32, 10_000],
  ...Array.from({ length: 21 }, (_, index) => [33 + index, 10_000] as const),
  [46, 20_000],
  [47, 20_000],
  [119, 10_000],
  [120, 10_000],
  [159, 10_000],
  [160, 10_000],
]);

const PHYSICAL_WEIGHTS: Readonly<Record<Mir4ClassId, number>> = {
  1: 60_000,
  2: 0,
  3: 30_000,
  4: 60_000,
  5: 30_000,
};
const MAGIC_WEIGHTS: Readonly<Record<Mir4ClassId, number>> = {
  1: 0,
  2: 60_000,
  3: 30_000,
  4: 0,
  5: 30_000,
};

/** Statuses whose effective values currently drive live MIR4 combat. */
export const MIR4_RUNTIME_STATUS_IDS = new Set([1, 6, 20, 22, 24, 26, 28, 29, 30, 31, 32, 41, 44]);

export interface Mir4DerivedPlayerStats {
  maxHp: number;
  maxMana: number;
  physicalAttack: number;
  magicAttack: number;
  physicalDefense: number;
  magicDefense: number;
  accuracy: number;
  dodge: number;
  critical: number;
  avoidCritical: number;
  criticalOutcome: number;
  bossDamageBps: number;
  skillDamageBps: number;
  manaCost: number;
  penetrationBps: number;
  mountMoveSpeedBps: number;
  mountBasicAttackSpeedBps: number;
  combatPower: number;
}

function combatPower(classId: Mir4ClassId, values: ReadonlyMap<number, number>): number {
  let scaled = 0n;
  for (const [statusId, value] of values) {
    const weight =
      statusId === 20
        ? PHYSICAL_WEIGHTS[classId]
        : statusId === 22
          ? MAGIC_WEIGHTS[classId]
          : (COMMON_COMBAT_POWER_WEIGHTS.get(statusId) ?? 0);
    if (weight !== 0) scaled += BigInt(Math.floor(value)) * BigInt(weight);
  }
  return Number(scaled / 10_000n);
}

export function deriveMir4PlayerStats(
  classId: Mir4ClassId,
  level: number,
  equipment?: Mir4Equipment,
  instances?: Record<number, Mir4EquipmentInstanceState>,
  spirits?: Mir4SpiritState,
  mounts?: Mir4MountState,
): Mir4DerivedPlayerStats {
  const row = mir4LevelRow(classId, level);
  if (!row) throw new Error(`mir4 level row missing for class ${classId} level ${level}`);
  const values = new Map<number, number>();
  for (const [rawStatusId, column] of Object.entries(LEVEL_STATUS_COLUMNS)) {
    values.set(Number(rawStatusId), Number(row[column] ?? 0));
  }
  for (const [statusId, value] of mir4EquippedAttributes(equipment, instances)) {
    values.set(statusId, (values.get(statusId) ?? 0) + value);
  }
  const spirit = mir4SpiritBonuses(spirits);
  values.set(20, (values.get(20) ?? 0) + spirit.physicalAttack);
  values.set(22, (values.get(22) ?? 0) + spirit.magicAttack);
  values.set(24, (values.get(24) ?? 0) + spirit.physicalDefense);
  values.set(26, (values.get(26) ?? 0) + spirit.magicDefense);
  values.set(28, (values.get(28) ?? 0) + spirit.accuracy);
  values.set(30, (values.get(30) ?? 0) + spirit.critical);
  const mount = mir4MountBonuses(mounts);
  values.set(24, (values.get(24) ?? 0) + mount.physicalDefense);
  values.set(26, (values.get(26) ?? 0) + mount.magicDefense);
  for (const [statusId, bps] of aggregateMir4PassiveBonuses(classId, level)) {
    const current = values.get(statusId) ?? 0;
    if (bps > 0 && current > 0)
      values.set(statusId, current + Math.floor((current * bps) / 10_000));
  }
  const get = (statusId: number) => values.get(statusId) ?? 0;
  return {
    maxHp: get(1),
    maxMana: get(6),
    physicalAttack: get(20),
    magicAttack: get(22),
    physicalDefense: get(24),
    magicDefense: get(26),
    accuracy: get(28),
    dodge: get(29),
    critical: get(30),
    avoidCritical: get(31),
    criticalOutcome: get(32),
    bossDamageBps: get(41),
    skillDamageBps: get(44),
    manaCost: get(19),
    penetrationBps: spirit.penetrationBps,
    mountMoveSpeedBps: mount.moveSpeedBps,
    mountBasicAttackSpeedBps: mount.basicAttackSpeedBps,
    combatPower: combatPower(classId, values),
  };
}
