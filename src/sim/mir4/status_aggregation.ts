// The one MIR4 character-status aggregation funnel. Level rows, equipment,
// collection albums and passives all enter here before combat, UI or Combat
// Power reads a value.

import { mir4LevelRow } from '../content/mir4';
import type { Mir4ClassId } from '../content/mir4/classes';
import { mir4EquipmentDefinition } from '../content/mir4/items';
import { aggregateMir4PassiveBonuses } from '../content/mir4/passives';
import { type Mir4CodexState, mir4CodexBonuses } from './codex';
import type { Mir4Equipment, Mir4EquipmentInstanceState } from './equipment';
import { mir4EquippedSpecialAffixBonuses, mir4ItemAttributes } from './equipment';
import { type Mir4MountState, mir4MountBonuses } from './mounts';
import { type Mir4SpiritState, mir4SpiritBonuses } from './spirits';
import {
  type Mir4StatusContribution,
  Mir4StatusLedger,
  type Mir4StatusSource,
} from './status_ledger';
import type { Mir4StatusValues } from './status_values';
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
  readonly contributions: readonly Mir4StatusContribution[];
  readonly penetrationBps: number;
  readonly penetrationDefenseBps: number;
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

function source(sourceKind: Mir4StatusSource['sourceKind'], sourceId: string): Mir4StatusSource {
  return { sourceKind, sourceId };
}

function addEquipmentContributions(
  ledger: Mir4StatusLedger,
  equipment: Mir4Equipment | undefined,
  instances: Record<number, Mir4EquipmentInstanceState> | undefined,
): void {
  for (const [slot, itemId] of Object.entries(equipment ?? {})) {
    if (itemId === undefined) continue;
    const def = mir4EquipmentDefinition(itemId);
    if (!def) continue;
    const instance = instances?.[itemId];
    if (instance?.destroyed) continue;

    const attributes = mir4ItemAttributes(def, instance);
    ledger.addAll(
      source('gear', `equipment:${slot}:${itemId}`),
      attributes.slice(0, def.baseAttributes.length),
    );
    for (const layer of ['enchantment', 'blessing'] as const) {
      ledger.addAll(
        source('affix', `equipment:${slot}:${itemId}:${layer}`),
        instance?.affixes?.[layer] ?? [],
      );
    }
  }
}

export function aggregateMir4CharacterStatuses(
  input: Mir4StatusAggregationInput,
): Mir4AggregatedCharacterStatuses {
  const row = mir4LevelRow(input.classId, input.level);
  if (!row) {
    throw new Error(`mir4 level row missing for class ${input.classId} level ${input.level}`);
  }
  const ledger = new Mir4StatusLedger();
  const levelSource = source('level', `level:${input.classId}:${input.level}`);
  for (const [rawStatusId, column] of Object.entries(LEVEL_STATUS_COLUMNS)) {
    ledger.add(levelSource, Number(rawStatusId), Number(row[column] ?? 0));
  }
  addEquipmentContributions(ledger, input.equipment, input.instances);
  ledger.addAll(
    source('training', `training:${input.classId}`),
    mir4TrainingStatusBonuses(input.classId, input.training),
  );

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
    ledger.add(source('spirit', 'spirit:collection-equipped'), statusId, spirit[stat]);
    ledger.add(source('mount', 'mount:collection-equipped'), statusId, mount[stat]);
    ledger.add(source('codex', 'codex:completed-collections'), statusId, codex[stat]);
  }

  for (const [statusId, rateBps] of aggregateMir4PassiveBonuses(input.classId, input.level)) {
    const current = ledger.value(statusId);
    if (rateBps > 0 && current > 0) {
      const difference = Math.floor((current * rateBps) / 10_000);
      ledger.add(
        source('passive', `passive:${input.classId}:status:${statusId}`),
        statusId,
        difference,
      );
    }
  }

  const snapshot = ledger.snapshot();
  const equipmentSpecials = mir4EquippedSpecialAffixBonuses(input.equipment, input.instances);
  return {
    values: snapshot.values,
    contributions: snapshot.contributions,
    penetrationBps:
      equipmentSpecials.penetrationBps +
      spirit.penetrationBps +
      mount.penetrationBps +
      codex.penetrationBps,
    penetrationDefenseBps: equipmentSpecials.penetrationDefenseBps,
    mountMoveSpeedBps: mount.moveSpeedBps,
    mountBasicAttackSpeedBps: mount.basicAttackSpeedBps,
  };
}
