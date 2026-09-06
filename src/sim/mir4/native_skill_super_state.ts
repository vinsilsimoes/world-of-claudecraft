import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeGeneratedMechanicalRow } from './native_skill_generated_contract';

export interface Mir4NativeRuntimeSuperState {
  readonly skillId: number;
  readonly attackId: number;
  readonly superIgnore: number;
  readonly superArmor: number;
  readonly actType: number;
  readonly ccUserCheck: number;
  readonly controlApplicationBasisPoints: number;
  readonly ccUserCheckRuntime: 'client-passed-unused';
}

export interface Mir4NativeExpectedSuperState {
  readonly skillId: number;
  readonly attackId: number;
  readonly superIgnore: number;
  readonly superArmor: number;
  readonly actType: number;
  readonly ccUserCheck: number;
  readonly runtimeAdmission: boolean;
}

const SUPER_STATE_POLICIES: readonly Mir4NativeExpectedSuperState[] = Object.freeze([
  Object.freeze({
    skillId: 1301,
    attackId: 130101,
    superIgnore: 0,
    superArmor: 9_000,
    actType: 0,
    ccUserCheck: 0,
    runtimeAdmission: false,
  }),
  Object.freeze({
    skillId: 1301,
    attackId: 130102,
    superIgnore: 100,
    superArmor: 9_000,
    actType: 0,
    ccUserCheck: 1_000,
    runtimeAdmission: true,
  }),
  Object.freeze({
    skillId: 1103,
    attackId: 110106,
    superIgnore: 1_000,
    superArmor: 0,
    actType: 0,
    ccUserCheck: 0,
    runtimeAdmission: true,
  }),
  ...[120101, 120102].map((attackId) =>
    Object.freeze({
      skillId: 1201,
      attackId,
      superIgnore: 1_000,
      superArmor: 0,
      actType: 0,
      ccUserCheck: 0,
      runtimeAdmission: true,
    }),
  ),
  Object.freeze({
    skillId: 1103,
    attackId: 110107,
    superIgnore: 100,
    superArmor: 0,
    actType: 0,
    ccUserCheck: 1_000,
    runtimeAdmission: true,
  }),
  Object.freeze({
    skillId: 1304,
    attackId: 130402,
    superIgnore: 100,
    superArmor: 0,
    actType: 0,
    ccUserCheck: 1_000,
    runtimeAdmission: true,
  }),
  Object.freeze({
    skillId: 1401,
    attackId: 140102,
    superIgnore: 0,
    superArmor: 0,
    actType: 0,
    ccUserCheck: 1_000,
    runtimeAdmission: false,
  }),
  ...[150101, 150102, 150103, 150104, 150105].map((attackId) =>
    Object.freeze({
      skillId: 1501,
      attackId,
      superIgnore: 0,
      superArmor: 9_000,
      actType: 0,
      ccUserCheck: 0,
      runtimeAdmission: false,
    }),
  ),
  Object.freeze({
    skillId: 1502,
    attackId: 150201,
    superIgnore: 0,
    superArmor: 9_000,
    actType: 0,
    ccUserCheck: 0,
    runtimeAdmission: false,
  }),
  ...[[410601, 0] as const, [410602, 100] as const, [410603, 0] as const].map(
    ([attackId, superIgnore]) =>
      Object.freeze({
        skillId: 4106,
        attackId,
        superIgnore,
        superArmor: 9_000,
        actType: 0,
        ccUserCheck: 0,
        runtimeAdmission: attackId === 410602,
      }),
  ),
]);

function generatedSuperState(
  skillId: number,
  attackId: number,
): Mir4NativeExpectedSuperState | null {
  const row = mir4NativeGeneratedMechanicalRow(skillId, attackId);
  if (!row) return null;
  const behavior = row.nativeBehavior;
  return Object.freeze({
    skillId,
    attackId,
    superIgnore: behavior.superIgnore,
    superArmor: behavior.superArmor,
    actType: behavior.actType,
    ccUserCheck: behavior.ccUserCheck,
    runtimeAdmission: behavior.superIgnore > 0,
  });
}

function policyForAttack(attackId: number) {
  return SUPER_STATE_POLICIES.find((candidate) => candidate.attackId === attackId) ?? null;
}

export function mir4NativeExpectedSuperState(
  skillId: number,
  attackId: number,
): Mir4NativeExpectedSuperState | null {
  return (
    SUPER_STATE_POLICIES.find(
      (candidate) => candidate.skillId === skillId && candidate.attackId === attackId,
    ) ?? generatedSuperState(skillId, attackId)
  );
}

/** Exact native row guard for recovered Warrior control-admission fields. */
export function mir4NativeSuperStateMatchesRow(row: Mir4NativeSkillAttackRow): boolean {
  const policy =
    policyForAttack(row.attackId) ??
    generatedSuperState(Math.trunc(row.attackId / 100), row.attackId);
  if (!policy) return false;
  const behavior = row.nativeBehavior;
  return (
    behavior.superIgnore === policy.superIgnore &&
    behavior.superArmor === policy.superArmor &&
    behavior.actType === policy.actType &&
    behavior.ccUserCheck === policy.ccUserCheck
  );
}

/**
 * Native control application values for the currently recovered rows.
 *
 * MirMobile FUN_1413f1580 passes CCUserCheck as R9 and SuperIgnore on the
 * stack to FUN_1413f2a90. That callee consumes SuperIgnore but never reads R9,
 * so CCUserCheck is preserved as source metadata without invented behavior.
 * Native per-mille application values are projected to the simulation's
 * basis-point control lane by the exact factor of ten.
 */
export function mir4NativeRuntimeSuperState(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeSuperState | null {
  const policy = mir4NativeExpectedSuperState(skillId, attackId);
  if (!policy?.runtimeAdmission) return null;
  const row = mir4NativeSkillActionById(skillId)?.rows.find(
    (candidate) => candidate.attackId === attackId,
  );
  if (!row || !mir4NativeSuperStateMatchesRow(row)) return null;
  return Object.freeze({
    skillId: policy.skillId,
    attackId: policy.attackId,
    superIgnore: policy.superIgnore,
    superArmor: policy.superArmor,
    actType: policy.actType,
    ccUserCheck: policy.ccUserCheck,
    controlApplicationBasisPoints: policy.superIgnore * 10,
    ccUserCheckRuntime: 'client-passed-unused' as const,
  });
}

/** Native application minus the target action row's active SuperArmor, in bps. */
export function mir4NativeControlAdmissionBasisPoints(
  source: Mir4NativeRuntimeSuperState,
  targetSuperArmorNative = 0,
): number {
  const targetDefenseBasisPoints = Math.max(0, Math.trunc(targetSuperArmorNative)) * 10;
  return Math.max(
    0,
    Math.min(10_000, source.controlApplicationBasisPoints - targetDefenseBasisPoints),
  );
}
