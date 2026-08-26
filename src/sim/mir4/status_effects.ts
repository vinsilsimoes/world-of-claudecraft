// Pure formulas for official MIR4 statuses that modify recovery, resource
// costs, cooldowns and progression. Callers own admission, inventory and RNG;
// this module only transforms an already-authored value.

import { type Mir4StatusRecord, mir4ApplyRate, mir4StatusRecordValue } from './status_values';

export type Mir4ProgressionRewardKind =
  | 'hunting-xp'
  | 'reward-xp'
  | 'hunting-copper'
  | 'reward-copper'
  | 'energy'
  | 'darksteel';

const REWARD_STATUS_IDS: Readonly<Record<Mir4ProgressionRewardKind, readonly number[]>> = {
  'hunting-xp': [82, 161],
  'reward-xp': [83],
  'hunting-copper': [84],
  'reward-copper': [85],
  energy: [86],
  darksteel: [87],
};

function summedStatus(values: Mir4StatusRecord | undefined, ids: readonly number[]): number {
  return ids.reduce((sum, id) => sum + mir4StatusRecordValue(values, id), 0);
}

export function mir4ModifiedPotionAmount(
  baseAmount: number,
  kind: 'hp' | 'mp',
  statuses: Mir4StatusRecord | undefined,
): number {
  const specificStatusId = kind === 'hp' ? 146 : 147;
  return mir4ApplyRate(
    baseAmount,
    mir4StatusRecordValue(statuses, 94) + mir4StatusRecordValue(statuses, specificStatusId),
    1,
  );
}

export function mir4ModifiedSkillCooldownSeconds(
  baseSeconds: number,
  statuses: Mir4StatusRecord | undefined,
): number {
  const reduction = Math.max(0, Math.min(8_000, mir4StatusRecordValue(statuses, 95)));
  return (Math.max(0, baseSeconds) * (10_000 - reduction)) / 10_000;
}

export function mir4ModifiedManaCost(
  baseCost: number,
  statuses: Mir4StatusRecord | undefined,
): number {
  const reduction = Math.max(0, Math.min(9_000, mir4StatusRecordValue(statuses, 97)));
  return Math.max(0, Math.floor((Math.max(0, baseCost) * (10_000 - reduction)) / 10_000));
}

export function mir4RecoveryPerTenSeconds(
  maxHp: number,
  maxMp: number,
  statuses: Mir4StatusRecord | undefined,
): { hp: number; mp: number } {
  const shared = mir4StatusRecordValue(statuses, 18);
  const hpFlat = mir4ApplyRate(
    mir4StatusRecordValue(statuses, 3),
    mir4StatusRecordValue(statuses, 4),
  );
  const mpFlat = mir4ApplyRate(
    mir4StatusRecordValue(statuses, 8),
    mir4StatusRecordValue(statuses, 9),
  );
  return {
    hp:
      shared +
      hpFlat +
      Math.floor((Math.max(0, maxHp) * mir4StatusRecordValue(statuses, 5)) / 10_000),
    mp:
      shared +
      mpFlat +
      Math.floor((Math.max(0, maxMp) * mir4StatusRecordValue(statuses, 10)) / 10_000),
  };
}

export function mir4DrainOnDamage(
  landedDamage: number,
  statuses: Mir4StatusRecord | undefined,
): { hp: number; mp: number } {
  const damage = Math.max(0, Math.floor(landedDamage));
  return {
    hp: Math.floor((damage * mir4StatusRecordValue(statuses, 80)) / 10_000),
    mp: Math.floor((damage * mir4StatusRecordValue(statuses, 81)) / 10_000),
  };
}

export function mir4ModifiedSkillHealing(
  baseHealing: number,
  statuses: Mir4StatusRecord | undefined,
): number {
  return mir4ApplyRate(baseHealing, mir4StatusRecordValue(statuses, 148));
}

export function mir4ManaRecoveredFromHealing(
  landedHealing: number,
  statuses: Mir4StatusRecord | undefined,
): number {
  return Math.floor((Math.max(0, landedHealing) * mir4StatusRecordValue(statuses, 149)) / 10_000);
}

export function mir4ModifiedProgressionReward(
  baseAmount: number,
  kind: Mir4ProgressionRewardKind,
  statuses: Mir4StatusRecord | undefined,
): number {
  return mir4ApplyRate(baseAmount, summedStatus(statuses, REWARD_STATUS_IDS[kind]));
}

export function mir4ModifiedDropChance(
  baseChance: number,
  statuses: Mir4StatusRecord | undefined,
): number {
  const chance = Math.max(0, Math.min(1, baseChance));
  const rate = Math.max(0, summedStatus(statuses, [88, 89]));
  return Math.max(0, Math.min(1, (chance * (10_000 + rate)) / 10_000));
}

export function mir4ModifiedGatherDurationSeconds(
  baseSeconds: number,
  kind: 'gathering' | 'energy' | 'mining',
  statuses: Mir4StatusRecord | undefined,
): number {
  const statusId = kind === 'gathering' ? 91 : kind === 'energy' ? 92 : 93;
  const boost = Math.max(0, mir4StatusRecordValue(statuses, statusId));
  return (Math.max(0, baseSeconds) * 10_000) / (10_000 + boost);
}

export function mir4ModifiedEnhancementChance(
  baseChance: number,
  equipSlot: number,
  statuses: Mir4StatusRecord | undefined,
): number {
  const statusId = equipSlot === 1 ? 110 : 111;
  const boosted = mir4ApplyRate(
    Math.max(0, Math.min(100_000, Math.floor(baseChance))),
    Math.max(0, mir4StatusRecordValue(statuses, statusId)),
  );
  return Math.min(100_000, boosted);
}
