import { mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { deepFreezeMir4NativeEvidence } from '../content/mir4/native_skill_raw_records';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { applyMir4NativeDarknessStack, mir4NativeDarknessStacks } from './native_darkness';

const SKILL_ID = 4107 as const;
const DIRECT_ATTACK_ID = 410702 as const;
const FIELD_ATTACK_IDS = new Set([410711, 410712, 410713, 410714, 410715, 410716]);

export const MIR4_NATIVE_FLASH_ARROW_RANK_EVIDENCE = deepFreezeMir4NativeEvidence({
  provenance: {
    specialAbilitySha256: '9f9c1c72f8ca0b5d6efe1beca20428e048bb042669a44e097b0cfe55e482c2db',
    passiveSha256: '533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e',
    buffSha256: '797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b',
  },
  specialRows: [
    {
      id: 212,
      minLevel: 1,
      maxLevel: 4,
      triggerAttackId: DIRECT_ATTACK_ID,
      skillOnlyPassiveIds: [600801],
    },
    {
      id: 213,
      minLevel: 5,
      maxLevel: 7,
      triggerAttackId: DIRECT_ATTACK_ID,
      skillOnlyPassiveIds: [600802, 640711, 640712, 640713, 640714, 640717],
    },
    {
      id: 214,
      minLevel: 8,
      maxLevel: 9,
      triggerAttackId: DIRECT_ATTACK_ID,
      skillOnlyPassiveIds: [600803, 600603, 640721, 640722, 640723, 640724, 640727],
    },
    {
      id: 215,
      minLevel: 10,
      maxLevel: 10,
      triggerAttackId: DIRECT_ATTACK_ID,
      skillOnlyPassiveIds: [600803, 600603, 640731, 640732, 640733, 640734, 640737],
    },
  ],
});

export interface Mir4NativeFlashArrowPolicy {
  readonly skillId: 4107;
  readonly skillLevel: number;
  readonly directAttackId: 410702;
  readonly baseAccuracy: Readonly<{ buffId: 41071; magnitude: number; durationMs: 1000 }>;
  readonly mark: Readonly<{ buffId: 40010; criticalEvasion: -25; durationMs: number }>;
  readonly directAccuracy: Readonly<{ buffId: 40540; magnitude: number; durationMs: 5000 }> | null;
  readonly critical: Readonly<{ buffId: 40539; magnitude: number; durationMs: 8000 }> | null;
  readonly darkness: Readonly<{ buffId: 30020; durationMs: 10000; maxStacks: 3 }> | null;
  readonly blind: Readonly<{
    buffId: 40528;
    durationMs: number;
    chancesByStacks: readonly [number, number, number];
  }> | null;
}

export function mir4NativeFlashArrowPolicy(
  requestedSkillLevel: number,
): Mir4NativeFlashArrowPolicy | null {
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.floor(requestedSkillLevel)));
  const rank10 = skillLevel >= 10;
  const rank8 = skillLevel >= 8;
  const rank5 = skillLevel >= 5;
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    directAttackId: DIRECT_ATTACK_ID,
    baseAccuracy: Object.freeze({
      buffId: 41071 as const,
      magnitude: -(50 + (skillLevel - 1) * 10),
      durationMs: 1000 as const,
    }),
    mark: Object.freeze({
      buffId: 40010 as const,
      criticalEvasion: -25 as const,
      durationMs: rank8 ? 10000 : rank5 ? 8000 : 5000,
    }),
    directAccuracy: rank5
      ? Object.freeze({
          buffId: 40540 as const,
          magnitude: rank10 ? -200 : rank8 ? -100 : -50,
          durationMs: 5000 as const,
        })
      : null,
    critical: rank5
      ? Object.freeze({
          buffId: 40539 as const,
          magnitude: rank10 ? -400 : rank8 ? -200 : -100,
          durationMs: 8000 as const,
        })
      : null,
    darkness: rank8
      ? Object.freeze({ buffId: 30020 as const, durationMs: 10000 as const, maxStacks: 3 as const })
      : null,
    blind: rank5
      ? Object.freeze({
          buffId: 40528 as const,
          durationMs: rank10 ? 5000 : rank8 ? 3000 : 2000,
          chancesByStacks: Object.freeze(
            rank10 ? [8000, 9000, 10000] : rank8 ? [6000, 6500, 7000] : [4000, 4500, 5000],
          ) as readonly [number, number, number],
        })
      : null,
  });
}

function replaceStatus(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  buffId: number,
  statusId: number,
  magnitude: number,
  durationMs: number,
  name: string,
): boolean {
  const effectId = `mir4_native_buff_${buffId}_${statusId}`;
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'native-status-boost',
    durationSeconds: durationMs / 1000,
    magnitude,
    nativeStatusId: statusId,
    name,
    sourceId: source.id,
  }).ok;
}

function replaceBlind(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  durationMs: number,
  name: string,
): boolean {
  const effectId = 'mir4_native_buff_40528_blind';
  if (target.mir4Effects) {
    target.mir4Effects.active = target.mir4Effects.active.filter(
      (effect) => effect.effectId !== effectId,
    );
  }
  return applyMir4Effect(ctx, target, {
    effectId,
    kind: 'blind',
    durationSeconds: durationMs / 1000,
    magnitude: 1,
    name,
    sourceId: source.id,
  }).ok;
}

export interface Mir4NativeFlashArrowContactResult {
  readonly applied: boolean;
  readonly baseAccuracyReduced: boolean;
  readonly marked: boolean;
  readonly directAccuracyReduced: boolean;
  readonly criticalReduced: boolean;
  readonly darknessStacks: number;
  readonly blinded: boolean;
}

/** Apply one landed direct shot or field pulse using the source-authored rank graph. */
export function applyMir4NativeFlashArrowContact(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  attackId: number,
  requestedSkillLevel: number,
): Mir4NativeFlashArrowContactResult {
  const empty = {
    applied: false,
    baseAccuracyReduced: false,
    marked: false,
    directAccuracyReduced: false,
    criticalReduced: false,
    darknessStacks: 0,
    blinded: false,
  } as const;
  const policy = mir4NativeFlashArrowPolicy(requestedSkillLevel);
  if (
    !policy ||
    source.dead ||
    target.dead ||
    (attackId !== DIRECT_ATTACK_ID && !FIELD_ATTACK_IDS.has(attackId)) ||
    !ctx.isHostileTo(source, target)
  ) {
    return empty;
  }
  const name = mir4SkillById(SKILL_ID)?.displayName ?? 'Flash Arrow';
  const baseAccuracyReduced = replaceStatus(
    ctx,
    source,
    target,
    policy.baseAccuracy.buffId,
    28,
    policy.baseAccuracy.magnitude,
    policy.baseAccuracy.durationMs,
    name,
  );
  if (attackId !== DIRECT_ATTACK_ID) {
    return {
      ...empty,
      applied: baseAccuracyReduced,
      baseAccuracyReduced,
    };
  }
  const marked = replaceStatus(
    ctx,
    source,
    target,
    policy.mark.buffId,
    31,
    policy.mark.criticalEvasion,
    policy.mark.durationMs,
    name,
  );
  const directAccuracyReduced = policy.directAccuracy
    ? replaceStatus(
        ctx,
        source,
        target,
        policy.directAccuracy.buffId,
        28,
        policy.directAccuracy.magnitude,
        policy.directAccuracy.durationMs,
        name,
      )
    : false;
  const criticalReduced = policy.critical
    ? replaceStatus(
        ctx,
        source,
        target,
        policy.critical.buffId,
        30,
        policy.critical.magnitude,
        policy.critical.durationMs,
        name,
      )
    : false;
  const darknessStacks = policy.darkness
    ? applyMir4NativeDarknessStack(ctx, source, target, policy.darkness.durationMs, name)
    : mir4NativeDarknessStacks(target);
  let blinded = false;
  if (policy.blind && darknessStacks > 0) {
    const chance = policy.blind.chancesByStacks[Math.min(2, darknessStacks - 1)] ?? 0;
    if (chance >= 10000 || Math.floor(ctx.rng.next() * 10000) < chance) {
      blinded = replaceBlind(ctx, source, target, policy.blind.durationMs, name);
    }
  }
  return {
    applied:
      baseAccuracyReduced ||
      marked ||
      directAccuracyReduced ||
      criticalReduced ||
      darknessStacks > 0 ||
      blinded,
    baseAccuracyReduced,
    marked,
    directAccuracyReduced,
    criticalReduced,
    darknessStacks,
    blinded,
  };
}

export function mir4NativeFlashArrowBuffsMatchRow(row: Mir4NativeSkillAttackRow): boolean {
  if (row.attackId === 410701) {
    return row.nativeBehavior.buffIds.length === 1 && row.nativeBehavior.buffIds[0] === 41010;
  }
  if (row.attackId === DIRECT_ATTACK_ID) {
    return row.nativeBehavior.buffIds.length === 1 && row.nativeBehavior.buffIds[0] === 41071;
  }
  return row.nativeBehavior.buffIds.length === 0;
}

export function mir4NativeFlashArrowFocusSchedule(): {
  readonly skillId: 4107;
  readonly attackId: 410701;
  readonly applyAtMs: 450;
} {
  return Object.freeze({ skillId: 4107, attackId: 410701, applyAtMs: 450 });
}
