import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';

const QUICK_SHOT_SKILL_ID = 4101;
const FOCUS_ATTACK_ID = 410101;
const FOCUS_BUFF_ID = 41010;
const FOCUS_EFFECT_ID = `mir4_native_buff_${FOCUS_BUFF_ID}`;
const FOCUS_DURATION_SECONDS = 30;
const MAX_FOCUS_STACKS = 10;
const CRITICAL_STATUS_ID = 30;

export function mir4NativeArbalistFocusBuffEvidenceExact(): boolean {
  const raw = mir4NativeSkillBuffEvidenceById(FOCUS_BUFF_ID)?.rawRecord;
  return (
    raw?.BuffId === FOCUS_BUFF_ID &&
    raw.ApplyType === 2 &&
    raw.BuffTarget === 1 &&
    raw.BuffTime === FOCUS_DURATION_SECONDS &&
    raw.BuffOverlap === MAX_FOCUS_STACKS &&
    raw.BuffProbability === 1_000 &&
    raw.BuffIndexType_1 === 3 &&
    raw.BuffIndex_1 === 4046 &&
    raw.OverLapCallGroupID === 2
  );
}

/** Exact source gate for the Focus writer carried by Quick Shot's first row. */
export function mir4NativeQuickShotBuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    mir4NativeArbalistFocusBuffEvidenceExact() &&
    row.attackId === FOCUS_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === FOCUS_BUFF_ID &&
    row.impactOffsetsMs.length === 2 &&
    row.impactOffsetsMs[0] === 113 &&
    row.impactOffsetsMs[1] === 213
  );
}

/** Exact source gate for the same Focus writer carried by Burst Shell's opening row. */
export function mir4NativeBurstShellFocusBuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    mir4NativeArbalistFocusBuffEvidenceExact() &&
    row.attackId === 410301 &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === FOCUS_BUFF_ID &&
    row.impactOffsetsMs.length === 1 &&
    row.impactOffsetsMs[0] === 400
  );
}

function criticalBonusForStacks(stacks: number): number {
  if (stacks >= 9) return 150;
  if (stacks >= 6) return 100;
  if (stacks >= 3) return 50;
  return 0;
}

/**
 * BUFF 41010 is the native 30-second, ten-overlap Focus counter. Official
 * Arbalist text resolves its otherwise opaque special-effect 4046: Weakness
 * Analysis contributes +50/+100/+150 CRIT at 3/6/9 stacks.
 */
export function applyMir4NativeArbalistFocus(ctx: SimContext, source: Entity): boolean {
  void ctx;
  if (source.dead || !mir4NativeArbalistFocusBuffEvidenceExact()) return false;
  if (!source.mir4Effects) source.mir4Effects = { active: [], controlImmuneUntil: 0 };
  const active = source.mir4Effects.active;
  const existing = active.find(
    (effect) => effect.effectId === FOCUS_EFFECT_ID && effect.remaining > CAST_COMPLETE_EPS,
  );
  const stacks = Math.min(MAX_FOCUS_STACKS, (existing?.nativeStacks ?? 0) + 1);
  if (existing) {
    existing.remaining = FOCUS_DURATION_SECONDS;
    existing.duration = FOCUS_DURATION_SECONDS;
    existing.nativeStacks = stacks;
    existing.magnitude = criticalBonusForStacks(stacks);
    existing.sourceId = source.id;
    existing.nativeStatusId = CRITICAL_STATUS_ID;
    return true;
  }
  active.push({
    effectId: FOCUS_EFFECT_ID,
    kind: 'native-status-boost',
    remaining: FOCUS_DURATION_SECONDS,
    duration: FOCUS_DURATION_SECONDS,
    magnitude: criticalBonusForStacks(stacks),
    sourceId: source.id,
    nativeStatusId: CRITICAL_STATUS_ID,
    nativeStacks: stacks,
  });
  return true;
}

export function mir4NativeArbalistFocusCriticalBonus(source: Entity): number {
  const focus = source.mir4Effects?.active.find(
    (effect) => effect.effectId === FOCUS_EFFECT_ID && effect.remaining > CAST_COMPLETE_EPS,
  );
  return focus?.nativeStatusId === CRITICAL_STATUS_ID ? Math.max(0, focus.magnitude) : 0;
}

/** Native class text removes Focus at combat exit, Knockdown, Stun or Blind. */
export function updateMir4NativeArbalistFocus(ctx: SimContext): void {
  for (const entity of ctx.entities.values()) {
    const effects = entity.mir4Effects;
    const active = effects?.active;
    if (!effects || !active?.some((effect) => effect.effectId === FOCUS_EFFECT_ID)) continue;
    const disqualifyingControl = active.some(
      (effect) =>
        effect.remaining > CAST_COMPLETE_EPS &&
        (effect.kind === 'knockdown' || effect.kind === 'stun' || effect.kind === 'blind'),
    );
    const focusActionPending = entity.mir4PendingImpacts?.some(
      (impact) =>
        (impact.skillId === 4101 ||
          impact.skillId === 4103 ||
          impact.skillId === 4104 ||
          impact.skillId === 4105 ||
          impact.skillId === 4107 ||
          impact.skillId === 4108 ||
          impact.skillId === 4109 ||
          impact.skillId === 4110 ||
          impact.skillId === 4111 ||
          impact.skillId === 4112 ||
          impact.skillId === 4113) &&
        impact.attackKind === 'skill',
    );
    if ((entity.inCombat || focusActionPending) && !disqualifyingControl) continue;
    effects.active = active.filter((effect) => effect.effectId !== FOCUS_EFFECT_ID);
  }
}

export function mir4NativeQuickShotFocusSchedule(): {
  skillId: 4101;
  attackId: 410101;
  applyAtMs: 213;
} {
  return {
    skillId: QUICK_SHOT_SKILL_ID,
    attackId: FOCUS_ATTACK_ID,
    applyAtMs: 213,
  };
}

export function mir4NativeBurstShellFocusSchedule(): {
  skillId: 4103;
  attackId: 410301;
  applyAtMs: 400;
} {
  return { skillId: 4103, attackId: 410301, applyAtMs: 400 };
}
