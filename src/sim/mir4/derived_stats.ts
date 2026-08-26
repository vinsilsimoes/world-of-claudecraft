// Pure MIR4 character-stat projection shared by the authoritative combat
// entity and the existing character-sheet provider. Combat Power follows the
// source COMBATPOINT table: sum effective STATUS * class weight, then divide
// by 10,000. The projection contains no host or UI state.

import type { Mir4ClassId } from '../content/mir4/classes';
import type { Mir4CodexState } from './codex';
import type { Mir4Equipment, Mir4EquipmentInstanceState } from './equipment';
import type { Mir4MountState } from './mounts';
import type { Mir4SpiritState } from './spirits';
import { aggregateMir4CharacterStatuses } from './status_aggregation';
import type { Mir4StatusRecord } from './status_values';
import type { Mir4TrainingState } from './training';

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

/** Statuses whose effective values currently drive a live runtime system. */
export const MIR4_RUNTIME_STATUS_IDS = new Set([
  1, 3, 4, 5, 6, 8, 9, 10, 18, 19, 20, 22, 24, 26, 28, 29, 30, 31, 32, 33, 38, 39, 40, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 77, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93,
  94, 95, 97, 110, 111, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133,
  134, 135, 136, 143, 146, 147, 148, 149, 153, 154, 155, 159, 160, 161,
]);

export interface Mir4DerivedPlayerStats {
  statusValues: Mir4StatusRecord;
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
  bossDamageReductionBps: number;
  pvpDamageBps: number;
  pvpDamageReductionBps: number;
  monsterDamageBps: number;
  monsterDamageReductionBps: number;
  skillDamageBps: number;
  skillDamageReductionBps: number;
  allDamageBps: number;
  allDamageReductionBps: number;
  stunSuccessBps: number;
  stunResistanceBps: number;
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
  codex?: Mir4CodexState,
  rewardItems?: Record<string, number>,
  training?: Mir4TrainingState,
): Mir4DerivedPlayerStats {
  const aggregated = aggregateMir4CharacterStatuses({
    classId,
    level,
    equipment,
    instances,
    spirits,
    mounts,
    codex,
    rewardItems,
    training,
  });
  const values = aggregated.values;
  const get = (statusId: number) => values.get(statusId) ?? 0;
  return {
    statusValues: Object.freeze(Object.fromEntries(values)),
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
    bossDamageReductionBps: get(43),
    pvpDamageBps: get(38),
    pvpDamageReductionBps: get(39),
    monsterDamageBps: get(40),
    monsterDamageReductionBps: get(42),
    skillDamageBps: get(44),
    skillDamageReductionBps: get(45),
    allDamageBps: get(46),
    allDamageReductionBps: get(47),
    stunSuccessBps: get(48),
    stunResistanceBps: get(49),
    manaCost: get(19),
    penetrationBps: aggregated.penetrationBps,
    mountMoveSpeedBps: aggregated.mountMoveSpeedBps,
    mountBasicAttackSpeedBps: aggregated.mountBasicAttackSpeedBps,
    combatPower: combatPower(classId, values),
  };
}
