import { mir4NativeSkillActionById } from '../content/mir4';
import {
  mir4NativeGeneratedMechanicalRow,
  mir4NativeRowHasDamageContact,
} from './native_skill_generated_contract';

const RUNTIME_AGGRO_POLICIES = new Map<
  number,
  ReadonlyMap<
    number,
    { readonly nativeRateBasisPoints: number; readonly appliesOnLandedDamageContact: boolean }
  >
>([
  [
    1102,
    new Map([
      [110202, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
      [110203, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
      [110204, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
    ]),
  ],
  [
    1103,
    new Map([
      [110105, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: false }],
      [110106, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
      [110107, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
    ]),
  ],
  [
    1104,
    new Map([[110402, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }]]),
  ],
  [
    1201,
    new Map([
      [120101, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
      [120102, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
      [120103, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
    ]),
  ],
  [
    1301,
    new Map([[130102, { nativeRateBasisPoints: 20_000, appliesOnLandedDamageContact: true }]]),
  ],
  [
    1304,
    new Map([[130402, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }]]),
  ],
  [
    1302,
    new Map([
      [130201, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: false }],
      [130202, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
      [130203, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
    ]),
  ],
  [
    1401,
    new Map([[140102, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }]]),
  ],
  [
    1501,
    new Map([
      [150101, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
      [150102, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
      [150103, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
      [150104, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
      [150105, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }],
    ]),
  ],
  [
    1601,
    new Map([[160103, { nativeRateBasisPoints: 10_000, appliesOnLandedDamageContact: true }]]),
  ],
  [3506, new Map([[350602, { nativeRateBasisPoints: 7000, appliesOnLandedDamageContact: true }]])],
  [4106, new Map([[410602, { nativeRateBasisPoints: 8000, appliesOnLandedDamageContact: true }]])],
]);

export interface Mir4NativeRuntimeAggroPolicy {
  readonly nativeRateBasisPoints: number;
  readonly appliesOnLandedDamageContact: boolean;
}

/** Exact SKILL_ATTACK AggroRate evidence admitted for Warrior 1102. */
export function mir4NativeRuntimeAggroPolicy(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeAggroPolicy | null {
  const generatedRow = mir4NativeGeneratedMechanicalRow(skillId, attackId);
  const expected =
    RUNTIME_AGGRO_POLICIES.get(skillId)?.get(attackId) ??
    (generatedRow && generatedRow.nativeBehavior.aggroRate > 0
      ? Object.freeze({
          nativeRateBasisPoints: generatedRow.nativeBehavior.aggroRate,
          appliesOnLandedDamageContact: mir4NativeRowHasDamageContact(generatedRow),
        })
      : undefined);
  if (expected === undefined) return null;
  const row =
    generatedRow ??
    mir4NativeSkillActionById(skillId)?.rows.find((candidate) => candidate.attackId === attackId);
  const nativeRateBasisPoints = row?.nativeBehavior.aggroRate;
  if (
    nativeRateBasisPoints !== expected.nativeRateBasisPoints ||
    !Number.isSafeInteger(nativeRateBasisPoints) ||
    nativeRateBasisPoints <= 0
  ) {
    return null;
  }
  return Object.freeze({ ...expected });
}

/**
 * Native FUN_1414141d0 projection. AggroRate is adjusted by the per-skill
 * option keys 0x1d/0x1e, multiplied by the damage value at 1e-4 scale, and
 * truncated to an integer. An exact zero becomes one.
 */
export function mir4NativeAggroThreatFromRate(
  baseValue: number,
  nativeRateBasisPoints: number,
  skillRateAdd = 0,
  skillRateReduction = 0,
): number | null {
  if (
    !Number.isSafeInteger(baseValue) ||
    baseValue < 0 ||
    !Number.isSafeInteger(nativeRateBasisPoints) ||
    !Number.isSafeInteger(skillRateAdd) ||
    !Number.isSafeInteger(skillRateReduction)
  ) {
    return null;
  }
  const effectiveRate = nativeRateBasisPoints + skillRateAdd - skillRateReduction;
  if (effectiveRate < 0) return null;
  const projected = Math.trunc((baseValue * effectiveRate) / 10_000);
  if (!Number.isSafeInteger(projected)) return null;
  return projected === 0 ? 1 : projected;
}

export function mir4NativeRuntimeAggroThreat(
  skillId: number,
  attackId: number,
  baseValue: number,
  skillRateAdd = 0,
  skillRateReduction = 0,
): number | null {
  const policy = mir4NativeRuntimeAggroPolicy(skillId, attackId);
  if (!policy?.appliesOnLandedDamageContact) return null;
  return mir4NativeAggroThreatFromRate(
    baseValue,
    policy.nativeRateBasisPoints,
    skillRateAdd,
    skillRateReduction,
  );
}
