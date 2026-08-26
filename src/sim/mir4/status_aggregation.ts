// The one MIR4 character-status aggregation funnel. Level rows, equipment,
// collection albums and passives all enter here before combat, UI or Combat
// Power reads a value.

import { mir4LevelRow } from '../content/mir4';
import type { Mir4ClassId } from '../content/mir4/classes';
import { aggregateMir4PassiveBonuses } from '../content/mir4/passives';
import { type Mir4CodexState, mir4CodexBonuses } from './codex';
import type { Mir4Equipment, Mir4EquipmentInstanceState } from './equipment';
import { mir4EquippedAttributes } from './equipment';
import { type Mir4MountState, mir4MountBonuses } from './mounts';
import { type Mir4SpiritState, mir4SpiritBonuses } from './spirits';
import { Mir4StatusAccumulator, type Mir4StatusValues } from './status_values';
import { type Mir4TrainingState, mir4TrainingStatusBonuses } from './training';

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

const ALBUM_STATUS_IDS = {
  maxHp: 1,
  maxMana: 6,
  physicalAttack: 20,
  magicAttack: 22,
  physicalDefense: 24,
  magicDefense: 26,
  accuracy: 28,
  dodge: 29,
  critical: 30,
  avoidCritical: 31,
  criticalOutcome: 32,
  bossDamageBps: 41,
  skillDamageBps: 44,
} as const;

export interface Mir4AggregatedCharacterStatuses {
  readonly values: Mir4StatusValues;
  readonly penetrationBps: number;
  readonly mountMoveSpeedBps: number;
  readonly mountBasicAttackSpeedBps: number;
}

export interface Mir4StatusAggregationInput {
  readonly classId: Mir4ClassId;
  readonly level: number;
  readonly equipment?: Mir4Equipment;
  readonly instances?: Record<number, Mir4EquipmentInstanceState>;
  readonly spirits?: Mir4SpiritState;
  readonly mounts?: Mir4MountState;
  readonly codex?: Mir4CodexState;
  readonly rewardItems?: Record<string, number>;
  readonly training?: Mir4TrainingState;
}

export function aggregateMir4CharacterStatuses(
  input: Mir4StatusAggregationInput,
): Mir4AggregatedCharacterStatuses {
  const row = mir4LevelRow(input.classId, input.level);
  if (!row) {
    throw new Error(`mir4 level row missing for class ${input.classId} level ${input.level}`);
  }
  const statuses = new Mir4StatusAccumulator();
  for (const [rawStatusId, column] of Object.entries(LEVEL_STATUS_COLUMNS)) {
    statuses.add(Number(rawStatusId), Number(row[column] ?? 0));
  }
  statuses.addAll(mir4EquippedAttributes(input.equipment, input.instances));
  statuses.addAll(mir4TrainingStatusBonuses(input.classId, input.training));

  const spirit = mir4SpiritBonuses(input.spirits);
  const mount = mir4MountBonuses(input.mounts);
  const codex = mir4CodexBonuses({
    classId: input.classId,
    level: input.level,
    state: input.codex,
    equipment: input.equipment,
    equipmentInstances: input.instances,
    rewardItems: input.rewardItems,
    mounts: input.mounts,
    spirits: input.spirits,
  });
  for (const [key, statusId] of Object.entries(ALBUM_STATUS_IDS)) {
    const stat = key as keyof typeof ALBUM_STATUS_IDS;
    statuses.add(statusId, spirit[stat] + mount[stat] + codex[stat]);
  }

  for (const [statusId, rateBps] of aggregateMir4PassiveBonuses(input.classId, input.level)) {
    const current = statuses.value(statusId);
    if (rateBps > 0 && current > 0) {
      statuses.add(statusId, Math.floor((current * rateBps) / 10_000));
    }
  }

  return {
    values: statuses.snapshot(),
    penetrationBps: spirit.penetrationBps + mount.penetrationBps + codex.penetrationBps,
    mountMoveSpeedBps: mount.moveSpeedBps,
    mountBasicAttackSpeedBps: mount.basicAttackSpeedBps,
  };
}
