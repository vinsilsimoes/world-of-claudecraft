import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type {
  Entity,
  Mir4NativePeriodicDamageEntry,
  Mir4NativePeriodicDamageState,
} from '../types';

const DRAGON_BREATH_BUFF_ID = 14_011;
const IMMOLATE_FIRE_FLARE_BUFF_ID = 20_012;
const NIRVANA_KICK_BLEED_BUFF_ID = 50_519;
const NATIVE_PERCENT_SCALE = 10_000;
const NATIVE_PERIODIC_INTERVAL_MS = 1_000;

export interface Mir4NativePeriodicDamagePlan {
  readonly buffId: number;
  readonly durationMs: number;
  readonly intervalMs: number;
  readonly entries: readonly Mir4NativePeriodicDamageEntry[];
}

function scaledBuffValue(base: number, levelUp: number, skillLevel: number): number {
  return base + Math.max(0, Math.floor(skillLevel) - 1) * levelUp;
}

/** Compile only periodic rows whose native writer, consumer and cadence have
 * been recovered. Unknown rows remain inert instead of inheriting a guessed
 * generic DoT formula. */
export function mir4NativePeriodicDamagePlan(
  buffId: number,
  skillLevel: number,
  sourceAttackPower: number,
): Mir4NativePeriodicDamagePlan | null {
  const row = mir4NativeSkillBuffEvidenceById(buffId)?.rawRecord;
  if (buffId === NIRVANA_KICK_BLEED_BUFF_ID) {
    if (
      row?.BuffTarget !== 0 ||
      row.ApplyType !== 1 ||
      row.BuffTime !== 2 ||
      row.LevelUpBuffTime !== 0 ||
      row.BuffProbability !== 1_000 ||
      row.BuffIndexType_1 !== 2 ||
      row.BuffIndex_1 !== 2_002 ||
      row.BuffValue_1 !== 2_000 ||
      row.LevelUpBuffValue_1 !== 500 ||
      row.BuffValueEx_1 !== 0 ||
      row.BuffIndexType_2 !== 0 ||
      row.BuffIndexType_3 !== 0
    ) {
      return null;
    }
    const physicalAttack = Math.max(0, Math.floor(sourceAttackPower));
    const damage = Math.floor(
      (physicalAttack * scaledBuffValue(row.BuffValue_1, row.LevelUpBuffValue_1, skillLevel)) /
        NATIVE_PERCENT_SCALE,
    );
    return Object.freeze({
      buffId,
      durationMs: row.BuffTime * 1_000,
      intervalMs: NATIVE_PERIODIC_INTERVAL_MS,
      entries: Object.freeze([
        Object.freeze({
          buffIndex: row.BuffIndex_1,
          channel: 'physical' as const,
          rawDamage: damage,
        }),
      ]),
    });
  }
  if (buffId === IMMOLATE_FIRE_FLARE_BUFF_ID) {
    if (
      row?.BuffTarget !== 0 ||
      row.ApplyType !== 1 ||
      row.BuffTime !== 5 ||
      row.LevelUpBuffTime !== 0 ||
      row.BuffProbability !== 1_000 ||
      row.BuffIndexType_1 !== 2 ||
      row.BuffIndex_1 !== 2_004 ||
      row.BuffValue_1 !== 6_000 ||
      row.LevelUpBuffValue_1 !== 1_200 ||
      row.BuffValueEx_1 !== 0 ||
      row.BuffIndexType_2 !== 3 ||
      row.BuffIndex_2 !== 4_032 ||
      row.BuffValue_2 !== 20_010 ||
      row.LevelUpBuffValue_2 !== 0 ||
      row.BuffValueEx_2 !== 0 ||
      row.BuffIndexType_3 !== 0
    ) {
      return null;
    }
    const spellAttack = Math.max(0, Math.floor(sourceAttackPower));
    const percentDamage = Math.floor(
      (spellAttack * scaledBuffValue(row.BuffValue_1, row.LevelUpBuffValue_1, skillLevel)) /
        NATIVE_PERCENT_SCALE,
    );
    return Object.freeze({
      buffId,
      durationMs: row.BuffTime * 1_000,
      intervalMs: NATIVE_PERIODIC_INTERVAL_MS,
      entries: Object.freeze([
        Object.freeze({
          buffIndex: row.BuffIndex_1,
          channel: 'magic' as const,
          rawDamage: percentDamage,
        }),
      ]),
    });
  }
  if (buffId !== DRAGON_BREATH_BUFF_ID) return null;
  if (
    row?.BuffTarget !== 0 ||
    row.ApplyType !== 1 ||
    row.BuffTime !== 5 ||
    row.LevelUpBuffTime !== 0 ||
    row.BuffProbability !== 1_000 ||
    row.BuffIndexType_1 !== 2 ||
    row.BuffIndex_1 !== 2_002 ||
    row.BuffValue_1 !== 1_000 ||
    row.LevelUpBuffValue_1 !== 0 ||
    row.BuffValueEx_1 !== 1 ||
    row.BuffIndexType_2 !== 2 ||
    row.BuffIndex_2 !== 2_001 ||
    row.BuffValue_2 !== 10 ||
    row.LevelUpBuffValue_2 !== 25 ||
    row.BuffValueEx_2 !== 1 ||
    row.BuffIndexType_3 !== 0
  ) {
    return null;
  }

  const attack = Math.max(0, Math.floor(sourceAttackPower));
  const percentDamage = Math.floor(
    (attack * scaledBuffValue(row.BuffValue_1, row.LevelUpBuffValue_1, skillLevel)) /
      NATIVE_PERCENT_SCALE,
  );
  const fixedDamage = scaledBuffValue(row.BuffValue_2, row.LevelUpBuffValue_2, skillLevel);
  return Object.freeze({
    buffId,
    durationMs: row.BuffTime * 1_000,
    intervalMs: NATIVE_PERIODIC_INTERVAL_MS,
    entries: Object.freeze([
      Object.freeze({
        buffIndex: row.BuffIndex_1,
        channel: 'physical' as const,
        rawDamage: percentDamage,
      }),
      Object.freeze({
        buffIndex: row.BuffIndex_2,
        channel: 'physical' as const,
        rawDamage: fixedDamage,
      }),
    ]),
  });
}

export function applyMir4NativePeriodicDamage(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  spec: {
    buffId: number;
    skillId: number;
    attackId: number;
    skillLevel: number;
    sourcePhysicalAttack?: number;
    sourceSpellAttack?: number;
  },
): boolean {
  if (source.dead || target.dead) return false;
  const sourceAttackPower =
    spec.buffId === IMMOLATE_FIRE_FLARE_BUFF_ID
      ? spec.sourceSpellAttack
      : spec.sourcePhysicalAttack;
  if (sourceAttackPower === undefined) return false;
  const plan = mir4NativePeriodicDamagePlan(spec.buffId, spec.skillLevel, sourceAttackPower);
  if (!plan) return false;

  target.mir4NativePeriodicLastPulseAt ??= ctx.time;
  const state: Mir4NativePeriodicDamageState = {
    buffId: plan.buffId,
    sourceId: source.id,
    skillId: spec.skillId,
    attackId: spec.attackId,
    skillLevel: spec.skillLevel,
    expiresAt: ctx.time + plan.durationMs / 1_000,
    entries: plan.entries.map((entry) => ({ ...entry })),
  };
  const active = target.mir4NativePeriodicDamage ?? [];
  const existing = active.findIndex((candidate) => candidate.buffId === plan.buffId);
  if (existing >= 0) active[existing] = state;
  else active.push(state);
  target.mir4NativePeriodicDamage = active;
  return true;
}

function schedulePeriodicEntries(
  source: Entity,
  target: Entity,
  state: Mir4NativePeriodicDamageState,
  dueAt: number,
): void {
  if (!source.mir4PendingImpacts) source.mir4PendingImpacts = [];
  for (const entry of state.entries) {
    if (entry.rawDamage <= 0) continue;
    source.mir4PendingImpacts.push({
      dueAt,
      sourceId: source.id,
      targetId: target.id,
      rawDamage: entry.rawDamage,
      channel: entry.channel,
      attackKind: 'skill',
      name:
        state.buffId === IMMOLATE_FIRE_FLARE_BUFF_ID
          ? 'Fire Flare'
          : state.buffId === NIRVANA_KICK_BLEED_BUFF_ID
            ? state.skillId === 5202
              ? 'Blitz Strike: Bleed'
              : 'Nirvana Kick: Bleed'
            : state.buffId === 40_505
              ? 'Burst Shell: Burn'
              : 'Dragon Breath',
      gaugeGain: 0,
      spiritProcEligible: false,
      forceHit: true,
      forceCritical: false,
      periodic: true,
    });
  }
}

/** Mirror the native actor update order: expired buffs are removed first,
 * then all surviving IndexType=2 entries share the actor's strict >1s clock. */
export function updateMir4NativePeriodicDamage(ctx: SimContext): void {
  for (const target of ctx.entities.values()) {
    if (target.dead) {
      target.mir4NativePeriodicDamage = undefined;
      target.mir4NativePeriodicLastPulseAt = ctx.time;
      continue;
    }

    target.mir4NativePeriodicLastPulseAt ??= ctx.time;
    const active = target.mir4NativePeriodicDamage?.filter((state) => state.expiresAt > ctx.time);
    target.mir4NativePeriodicDamage = active?.length ? active : undefined;

    if (ctx.time - target.mir4NativePeriodicLastPulseAt <= 1) continue;
    target.mir4NativePeriodicLastPulseAt = ctx.time;
    if (!active) continue;
    for (const state of active) {
      const source = ctx.entities.get(state.sourceId);
      if (!source || source.dead) continue;
      schedulePeriodicEntries(source, target, state, ctx.time);
    }
  }
}
