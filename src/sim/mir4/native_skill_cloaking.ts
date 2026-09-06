import { mir4NativeSkillActionById, mir4SkillById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import type { SimContext } from '../sim_context';
import { dropThreat } from '../threat';
import type { Aura, Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { mir4NativeArbalistFocusBuffEvidenceExact } from './native_skill_quick_shot';
import { markMir4WireDirty } from './wire_revision';

const SKILL_ID = 4112 as const;
const FOCUS_ATTACK_ID = 411201 as const;
const CLOAK_ATTACK_ID = 411202 as const;
const FOCUS_BUFF_ID = 41010 as const;
const CLOAK_BUFF_ID = 40108 as const;
const CLOAK_AURA_ID = 'mir4_native_buff_' + CLOAK_BUFF_ID;
const AFTEREFFECT_ID = 'mir4_native_buff_40109_44';

export interface Mir4NativeCloakingPolicy {
  readonly skillId: 4112;
  readonly skillLevel: number;
  readonly focusAttackId: 411201;
  readonly focusApplyAtMs: 20;
  readonly cloakAttackId: 411202;
  readonly cloakApplyAtMs: 80;
  readonly stealthDurationMs: 2_000 | 3_000 | 4_000 | 5_000;
  readonly healingBasisPoints: 0 | 1_000 | 2_000 | 3_000;
  readonly exitSkillDamageBasisPoints: 2_000 | 3_000 | 5_000 | 8_000;
  readonly exitSkillDamageDurationMs: 2_000;
  readonly allDamageReductionBasisPoints: 0 | 2_500 | 5_000;
  readonly knockdownResistanceBasisPoints: 0 | 2_000 | 5_000;
  readonly stunResistanceBasisPoints: 0 | 5_000;
  readonly movementSpeedNative: 0 | 100 | 300;
  readonly usableWhileSilenced: boolean;
}

function exactNativeCloakingSource(): boolean {
  const action = mir4NativeSkillActionById(SKILL_ID);
  const skill = mir4SkillById(SKILL_ID);
  const focus = action?.rows.find((row) => row.attackId === FOCUS_ATTACK_ID);
  const cloak = action?.rows.find((row) => row.attackId === CLOAK_ATTACK_ID);
  const recovery = action?.rows.find((row) => row.attackId === 411203);
  return Boolean(
    action &&
      skill &&
      focus &&
      cloak &&
      recovery &&
      action.cooldownMs === 60_000 &&
      action.skillCostType === 2 &&
      action.skillCost === 5_500 &&
      action.attackAnimationMs === 600 &&
      action.endCutAnimationMs === 560 &&
      action.requiredClassLevel === 56 &&
      action.targeting === false &&
      skill.requiresTarget === false &&
      focus.impactOffsetsMs.length === 1 &&
      focus.impactOffsetsMs[0] === 20 &&
      focus.nativeBehavior.buffIds.length === 1 &&
      focus.nativeBehavior.buffIds[0] === FOCUS_BUFF_ID &&
      focus.nativeBehavior.totem?.id === 1402 &&
      cloak.impactOffsetsMs.length === 1 &&
      cloak.impactOffsetsMs[0] === 80 &&
      cloak.movement.kind === 'direct' &&
      cloak.movement.nativeRange === 1000 &&
      cloak.movement.delayMs === 60 &&
      cloak.movement.durationMs === 500 &&
      recovery.nextAttackId === 0,
  );
}

export function mir4NativeCloakingFocusBuffMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  return (
    exactNativeCloakingSource() &&
    mir4NativeArbalistFocusBuffEvidenceExact() &&
    row.attackId === FOCUS_ATTACK_ID &&
    row.nativeBehavior.buffIds.length === 1 &&
    row.nativeBehavior.buffIds[0] === FOCUS_BUFF_ID
  );
}

export function mir4NativeCloakingPolicy(
  requestedSkillLevel: number,
): Mir4NativeCloakingPolicy | null {
  if (!Number.isFinite(requestedSkillLevel) || !exactNativeCloakingSource()) return null;
  const skillLevel = Math.max(1, Math.min(15, Math.trunc(requestedSkillLevel)));
  if (skillLevel >= 10) {
    return Object.freeze({
      skillId: SKILL_ID,
      skillLevel,
      focusAttackId: FOCUS_ATTACK_ID,
      focusApplyAtMs: 20,
      cloakAttackId: CLOAK_ATTACK_ID,
      cloakApplyAtMs: 80,
      stealthDurationMs: 5_000,
      healingBasisPoints: 3_000,
      exitSkillDamageBasisPoints: 8_000,
      exitSkillDamageDurationMs: 2_000,
      allDamageReductionBasisPoints: 5_000,
      knockdownResistanceBasisPoints: 5_000,
      stunResistanceBasisPoints: 5_000,
      movementSpeedNative: 300,
      usableWhileSilenced: true,
    });
  }
  if (skillLevel >= 8) {
    return Object.freeze({
      skillId: SKILL_ID,
      skillLevel,
      focusAttackId: FOCUS_ATTACK_ID,
      focusApplyAtMs: 20,
      cloakAttackId: CLOAK_ATTACK_ID,
      cloakApplyAtMs: 80,
      stealthDurationMs: 4_000,
      healingBasisPoints: 2_000,
      exitSkillDamageBasisPoints: 5_000,
      exitSkillDamageDurationMs: 2_000,
      allDamageReductionBasisPoints: 2_500,
      knockdownResistanceBasisPoints: 2_000,
      stunResistanceBasisPoints: 0,
      movementSpeedNative: 100,
      usableWhileSilenced: true,
    });
  }
  if (skillLevel >= 5) {
    return Object.freeze({
      skillId: SKILL_ID,
      skillLevel,
      focusAttackId: FOCUS_ATTACK_ID,
      focusApplyAtMs: 20,
      cloakAttackId: CLOAK_ATTACK_ID,
      cloakApplyAtMs: 80,
      stealthDurationMs: 3_000,
      healingBasisPoints: 1_000,
      exitSkillDamageBasisPoints: 3_000,
      exitSkillDamageDurationMs: 2_000,
      allDamageReductionBasisPoints: 0,
      knockdownResistanceBasisPoints: 0,
      stunResistanceBasisPoints: 0,
      movementSpeedNative: 0,
      usableWhileSilenced: false,
    });
  }
  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    focusAttackId: FOCUS_ATTACK_ID,
    focusApplyAtMs: 20,
    cloakAttackId: CLOAK_ATTACK_ID,
    cloakApplyAtMs: 80,
    stealthDurationMs: 2_000,
    healingBasisPoints: 0,
    exitSkillDamageBasisPoints: 2_000,
    exitSkillDamageDurationMs: 2_000,
    allDamageReductionBasisPoints: 0,
    knockdownResistanceBasisPoints: 0,
    stunResistanceBasisPoints: 0,
    movementSpeedNative: 0,
    usableWhileSilenced: false,
  });
}

function activeCloakingAura(target: Entity): Aura | null {
  return (
    target.auras.find((aura) => aura.id === CLOAK_AURA_ID && aura.remaining > CAST_COMPLETE_EPS) ??
    null
  );
}

function dropCloakedSourceFromHostileFocus(ctx: SimContext, source: Entity): void {
  source.combatTimer = 5;
  source.inCombat = false;
  source.autoAttack = false;
  source.targetId = null;
  source.queuedOnSwing = null;
  delete source.queuedOnSwingFree;
  delete source.queuedOnSwingCostMultiplier;
  const pet = ctx.petOf(source.id);
  const escapeIds = pet ? [source.id, pet.id] : [source.id];
  if (pet) {
    pet.combatTimer = 5;
    pet.inCombat = false;
    pet.aggroTargetId = null;
    pet.targetId = null;
  }
  for (const entity of ctx.entities.values()) {
    if (entity.kind !== 'mob' || entity.dead || !ctx.isHostileTo(source, entity)) continue;
    let dropped = false;
    for (const id of escapeIds) {
      if (entity.threat.has(id) || entity.forcedTargetId === id) dropped = true;
      dropThreat(entity, id);
      if (entity.aggroTargetId === id) {
        entity.aggroTargetId = null;
        dropped = true;
      }
    }
    if (!dropped) continue;
    if (entity.ownerId !== null) {
      if (entity.aggroTargetId === null) entity.inCombat = false;
    } else if (entity.threat.size === 0 && entity.aggroTargetId === null) {
      entity.aiState = 'evade';
      entity.inCombat = false;
    }
  }
}

export function applyMir4NativeCloaking(
  ctx: SimContext,
  source: Entity,
  requestedSkillLevel: number,
): boolean {
  const policy = mir4NativeCloakingPolicy(requestedSkillLevel);
  if (!policy || source.dead) return false;
  source.auras = source.auras.filter((aura) => aura.id !== CLOAK_AURA_ID);
  source.auras.push({
    id: CLOAK_AURA_ID,
    name: mir4SkillById(SKILL_ID)?.displayName ?? 'Cloaking',
    kind: 'stealth',
    remaining: policy.stealthDurationMs / 1_000,
    duration: policy.stealthDurationMs / 1_000,
    value: policy.skillLevel,
    sourceId: source.id,
    school: 'physical',
  });
  source.stealthed = true;
  const meta = ctx.players.get(source.id);
  if (meta?.autoBattle?.mode === 'battle') {
    meta.autoBattle.mode = 'off';
    meta.autoBattle.nativeSkillTrace = undefined;
    markMir4WireDirty(meta);
  }
  dropCloakedSourceFromHostileFocus(ctx, source);
  if (policy.healingBasisPoints > 0) {
    source.hp = Math.min(
      source.maxHp,
      source.hp + Math.floor((source.maxHp * policy.healingBasisPoints) / 10_000),
    );
  }
  ctx.emit({
    type: 'aura',
    targetId: source.id,
    name: 'Cloaking',
    gained: true,
  });
  return true;
}

export function applyMir4NativeCloakingAftereffect(
  ctx: SimContext,
  target: Entity,
  aura: Aura,
): boolean {
  if (aura.id !== CLOAK_AURA_ID) return false;
  const policy = mir4NativeCloakingPolicy(aura.value);
  if (!policy || target.dead) return false;
  if (!target.mir4Effects) target.mir4Effects = { active: [], controlImmuneUntil: 0 };
  target.mir4Effects.active = target.mir4Effects.active.filter(
    (effect) => effect.effectId !== AFTEREFFECT_ID,
  );
  target.mir4Effects.active.push({
    effectId: AFTEREFFECT_ID,
    kind: 'native-status-boost',
    remaining: policy.exitSkillDamageDurationMs / 1_000,
    duration: policy.exitSkillDamageDurationMs / 1_000,
    magnitude: policy.exitSkillDamageBasisPoints,
    sourceId: target.id,
    nativeStatusId: 44,
  });
  void ctx;
  return true;
}

export function breakMir4NativeCloaking(ctx: SimContext, target: Entity): boolean {
  const index = target.auras.findIndex((aura) => aura.id === CLOAK_AURA_ID);
  if (index < 0) return false;
  const [removed] = target.auras.splice(index, 1);
  if (!removed) return false;
  target.stealthed = target.auras.some((aura) => aura.kind === 'stealth');
  ctx.emit({
    type: 'aura',
    targetId: target.id,
    name: removed.name,
    gained: false,
  });
  applyMir4NativeCloakingAftereffect(ctx, target, removed);
  return true;
}

export function mir4NativeCloakingStatusBonus(target: Entity, nativeStatusId: number): number {
  const aura = activeCloakingAura(target);
  const policy = aura ? mir4NativeCloakingPolicy(aura.value) : null;
  if (!policy) return 0;
  if (nativeStatusId === 47) return policy.allDamageReductionBasisPoints;
  if (nativeStatusId === 49) return policy.stunResistanceBasisPoints;
  if (nativeStatusId === 76) return policy.movementSpeedNative;
  if (nativeStatusId === 120) return policy.knockdownResistanceBasisPoints;
  return 0;
}
