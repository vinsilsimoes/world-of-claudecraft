import { mir4NativeSkillActionById } from '../content/mir4';
import {
  mir4NativeGeneratedMechanicalRow,
  mir4NativeRowHasDamageContact,
} from './native_skill_generated_contract';

/** Exact CLASS.MaxRage for all five playable MIR4 classes. */
export const MIR4_NATIVE_MAX_RAGE_POINTS = 100_000;

const RUNTIME_ATTACK_RAGE_POLICIES = new Map<
  number,
  ReadonlyMap<
    number,
    { readonly nativePoints: number; readonly appliesOnLandedDamageContact: boolean }
  >
>([
  [
    1102,
    new Map([
      [110202, { nativePoints: 499, appliesOnLandedDamageContact: true }],
      [110203, { nativePoints: 499, appliesOnLandedDamageContact: true }],
      [110204, { nativePoints: 544, appliesOnLandedDamageContact: true }],
    ]),
  ],
  [
    1103,
    new Map([
      [110105, { nativePoints: 1037, appliesOnLandedDamageContact: false }],
      [110106, { nativePoints: 768, appliesOnLandedDamageContact: true }],
      [110107, { nativePoints: 768, appliesOnLandedDamageContact: true }],
    ]),
  ],
  [1104, new Map([[110402, { nativePoints: 992, appliesOnLandedDamageContact: true }]])],
  [
    1201,
    new Map([
      [120101, { nativePoints: 634, appliesOnLandedDamageContact: true }],
      [120102, { nativePoints: 634, appliesOnLandedDamageContact: true }],
      [120103, { nativePoints: 678, appliesOnLandedDamageContact: true }],
    ]),
  ],
  [1301, new Map([[130102, { nativePoints: 1552, appliesOnLandedDamageContact: true }]])],
  [
    1302,
    new Map([
      [130202, { nativePoints: 1037, appliesOnLandedDamageContact: true }],
      [130203, { nativePoints: 100, appliesOnLandedDamageContact: true }],
    ]),
  ],
  [1304, new Map([[130402, { nativePoints: 947, appliesOnLandedDamageContact: true }]])],
  [1401, new Map([[140102, { nativePoints: 990, appliesOnLandedDamageContact: true }]])],
  [
    1501,
    new Map([
      [150101, { nativePoints: 678, appliesOnLandedDamageContact: true }],
      [150102, { nativePoints: 634, appliesOnLandedDamageContact: true }],
      [150103, { nativePoints: 634, appliesOnLandedDamageContact: true }],
      [150104, { nativePoints: 499, appliesOnLandedDamageContact: true }],
      [150105, { nativePoints: 544, appliesOnLandedDamageContact: true }],
    ]),
  ],
  [1601, new Map([[160103, { nativePoints: 990, appliesOnLandedDamageContact: true }]])],
  [3506, new Map([[350602, { nativePoints: 1222, appliesOnLandedDamageContact: true }]])],
  [
    4106,
    new Map([
      [410602, { nativePoints: 1160, appliesOnLandedDamageContact: true }],
      [410603, { nativePoints: 1160, appliesOnLandedDamageContact: false }],
    ]),
  ],
]);

const RUNTIME_HIT_RAGE_POLICIES = new Map<
  number,
  ReadonlyMap<number, { readonly nativePoints: number; readonly appliesOnLandedPlayerHit: boolean }>
>([
  [
    1102,
    new Map([
      [110201, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [110202, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [110203, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [110204, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    1103,
    new Map([
      [110105, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [110106, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [110107, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    1104,
    new Map([
      [110401, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [110402, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    1301,
    new Map([
      [130101, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [130102, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    1201,
    new Map([
      [120101, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [120102, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [120103, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    1304,
    new Map([
      [130401, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [130402, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    1302,
    new Map([
      [130201, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [130202, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [130203, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    1401,
    new Map([
      [140101, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [140102, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    1501,
    new Map([
      [150101, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [150102, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [150103, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [150104, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [150105, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    1601,
    new Map([
      [160101, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [160102, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [160103, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    1502,
    new Map([
      [150201, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [150202, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    3506,
    new Map([
      [350601, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [350602, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
    ]),
  ],
  [
    4106,
    new Map([
      [410601, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
      [410602, { nativePoints: 240, appliesOnLandedPlayerHit: true }],
      [410603, { nativePoints: 240, appliesOnLandedPlayerHit: false }],
    ]),
  ],
]);

export interface Mir4NativeRuntimeAttackRageGain {
  readonly nativePoints: number;
  /** Aeldrune stores the same gauge as 0..100 rather than native 0..100000. */
  readonly gaugePercent: number;
}

export interface Mir4NativeRuntimeAttackRagePolicy {
  readonly nativePoints: number;
  readonly appliesOnLandedDamageContact: boolean;
}

export interface Mir4NativeRuntimeHitRagePolicy {
  readonly nativePoints: number;
  /** 110201 carries the same source value but authors no landed contact. */
  readonly appliesOnLandedPlayerHit: boolean;
}

export interface Mir4NativeHitRageModifiers {
  /** Per-skill flat modifier key 0x2f in the native character map. */
  readonly flatAdd?: number;
  /** Per-skill flat reduction key 0x31 in the native character map. */
  readonly flatReduction?: number;
  /** Character rage-recovery rate key 0x60. */
  readonly generalRateAdd?: number;
  /** Per-skill rate modifier key 0x30. */
  readonly skillRateAdd?: number;
  /** Per-skill rate reduction key 0x32. */
  readonly skillRateReduction?: number;
}

export interface Mir4NativeRuntimeHitRageGain {
  readonly nativePoints: number;
  readonly gaugePercent: number;
}

/**
 * Exact landed-hit AttackRagePoint projection for the currently homologated
 * action. The native server adds this row value after a hit and clamps it to
 * CLASS.MaxRage; misses add zero. Other skills remain closed until their
 * complete attack rows reach the same runtime gate.
 */
export function mir4NativeRuntimeAttackRageGain(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeAttackRageGain | null {
  const policy = mir4NativeRuntimeAttackRagePolicy(skillId, attackId);
  if (!policy?.appliesOnLandedDamageContact) return null;
  return mir4NativeAttackRageGainFromPoints(policy.nativePoints);
}

/** Convert an already-validated Totem SKILL_ATTACK AttackRagePoint field. */
export function mir4NativeAttackRageGainFromPoints(
  nativePoints: number,
): Mir4NativeRuntimeAttackRageGain | null {
  if (!Number.isSafeInteger(nativePoints) || nativePoints <= 0) return null;
  return Object.freeze({
    nativePoints,
    gaugePercent: (nativePoints * 100) / MIR4_NATIVE_MAX_RAGE_POINTS,
  });
}

export function mir4NativeRuntimeAttackRagePolicy(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeAttackRagePolicy | null {
  const generatedRow = mir4NativeGeneratedMechanicalRow(skillId, attackId);
  const expected =
    RUNTIME_ATTACK_RAGE_POLICIES.get(skillId)?.get(attackId) ??
    (generatedRow && generatedRow.nativeBehavior.attackRagePoint > 0
      ? Object.freeze({
          nativePoints: generatedRow.nativeBehavior.attackRagePoint,
          appliesOnLandedDamageContact: mir4NativeRowHasDamageContact(generatedRow),
        })
      : undefined);
  if (expected === undefined) return null;
  const row =
    generatedRow ??
    mir4NativeSkillActionById(skillId)?.rows.find((candidate) => candidate.attackId === attackId);
  const nativePoints = row?.nativeBehavior.attackRagePoint;
  if (
    nativePoints !== expected.nativePoints ||
    !Number.isSafeInteger(nativePoints) ||
    nativePoints <= 0
  ) {
    return null;
  }
  return Object.freeze({ ...expected });
}

/**
 * Exact SKILL_ATTACK HitRagePoint evidence admitted for Warrior 1102. The
 * setup/guide row is preserved in the policy, but cannot award rage because it
 * has no damage contact. The client consumer applies this field only to a PC.
 */
export function mir4NativeRuntimeHitRagePolicy(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeHitRagePolicy | null {
  const generatedRow = mir4NativeGeneratedMechanicalRow(skillId, attackId);
  const expected =
    RUNTIME_HIT_RAGE_POLICIES.get(skillId)?.get(attackId) ??
    (generatedRow && generatedRow.nativeBehavior.hitRagePoint > 0
      ? Object.freeze({
          nativePoints: generatedRow.nativeBehavior.hitRagePoint,
          appliesOnLandedPlayerHit: mir4NativeRowHasDamageContact(generatedRow),
        })
      : undefined);
  if (!expected) return null;
  const row =
    generatedRow ??
    mir4NativeSkillActionById(skillId)?.rows.find((candidate) => candidate.attackId === attackId);
  const nativePoints = row?.nativeBehavior.hitRagePoint;
  if (
    nativePoints !== expected.nativePoints ||
    !Number.isSafeInteger(nativePoints) ||
    nativePoints <= 0
  ) {
    return null;
  }
  return Object.freeze({ ...expected });
}

/**
 * Native order of operations from the 1102 hit consumer:
 *   adjusted = base + flatAdd - flatReduction
 *   result = adjusted + trunc(adjusted * (general + rateAdd - rateReduction) / 10000)
 * Only positive results are dispatched by the native client.
 */
export function mir4NativeResolveHitRageGain(
  skillId: number,
  attackId: number,
  modifiers: Mir4NativeHitRageModifiers = {},
): Mir4NativeRuntimeHitRageGain | null {
  const policy = mir4NativeRuntimeHitRagePolicy(skillId, attackId);
  if (!policy?.appliesOnLandedPlayerHit) return null;
  return mir4NativeResolveHitRageGainFromPoints(policy.nativePoints, modifiers);
}

/** Apply the native hit-rage modifier order to an already-validated Totem row. */
export function mir4NativeResolveHitRageGainFromPoints(
  baseNativePoints: number,
  modifiers: Mir4NativeHitRageModifiers = {},
): Mir4NativeRuntimeHitRageGain | null {
  if (!Number.isSafeInteger(baseNativePoints) || baseNativePoints <= 0) return null;
  const flatAdd = modifiers.flatAdd ?? 0;
  const flatReduction = modifiers.flatReduction ?? 0;
  const generalRateAdd = modifiers.generalRateAdd ?? 0;
  const skillRateAdd = modifiers.skillRateAdd ?? 0;
  const skillRateReduction = modifiers.skillRateReduction ?? 0;
  const values = [flatAdd, flatReduction, generalRateAdd, skillRateAdd, skillRateReduction];
  if (!values.every(Number.isSafeInteger)) return null;
  const adjusted = baseNativePoints + flatAdd - flatReduction;
  const rate = generalRateAdd + skillRateAdd - skillRateReduction;
  const nativePoints = adjusted + Math.trunc((adjusted * rate) / 10_000);
  if (!Number.isSafeInteger(nativePoints) || nativePoints <= 0) return null;
  return Object.freeze({
    nativePoints,
    gaugePercent: (nativePoints * 100) / MIR4_NATIVE_MAX_RAGE_POINTS,
  });
}
