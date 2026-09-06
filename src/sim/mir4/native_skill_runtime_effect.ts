import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import {
  type Mir4SkillDef,
  type Mir4SkillEffect,
  mir4SkillById,
} from '../content/mir4/skills_runtime';
import { compileMir4NativeImpactType2CircleGeometry } from './native_impact_type2_geometry';
import { compileMir4NativeImpactType3Geometry } from './native_impact_type3_geometry';
import { mir4NativeCrowdControlReactionMatchesRow } from './native_skill_crowd_control';
import { mir4NativeHealPolicy } from './native_skill_heal';
import { mir4NativeServerCrowdControlWindowMs } from './native_skill_reactions';

export interface Mir4NativeRuntimeSkillEffectProjection {
  readonly skillId: number;
  readonly sourceAttackId: number;
  readonly nativeTargetCap: number;
  readonly effect: Readonly<Mir4SkillEffect>;
}

interface Mir4NativeRuntimeSkillEffectPolicy {
  readonly projection: Mir4NativeRuntimeSkillEffectProjection;
  readonly validatesCrowdControlReaction: boolean;
  readonly geometry:
    | {
        readonly kind: 'actor-circle';
        readonly radiusMinYards: number;
        readonly radiusMaxYards: number;
        readonly heightYards: number;
        readonly forwardOffsetYards: number;
      }
    | {
        readonly kind: 'frontal-strip';
        readonly lengthYards: number;
        readonly widthYards: number;
        readonly heightYards: number;
      };
}

export type Mir4NativeRuntimeSkillEffectIssueCode =
  | 'source-mismatch'
  | 'native-effect-mismatch'
  | 'runtime-effect-mismatch';

export interface Mir4NativeRuntimeSkillEffectIssue {
  readonly code: Mir4NativeRuntimeSkillEffectIssueCode;
  readonly path: string;
}

export type Mir4NativeRuntimeSkillEffectCompileResult =
  | { readonly ok: true; readonly projection: Mir4NativeRuntimeSkillEffectProjection }
  | { readonly ok: false; readonly issues: readonly Mir4NativeRuntimeSkillEffectIssue[] };

const CUTTER_EFFECT = Object.freeze({
  effect: 'knockdown',
  durationMs: 3_000,
  areaOrigin: 'actor',
  areaShape: 'frontal-strip',
  areaLengthPx: 112,
  areaWidthPx: 88,
  maxSecondaryTargets: 7,
  secondaryDamageBasisPoints: 10_000,
}) satisfies Readonly<Mir4SkillEffect>;

const BARBARIC_CHARGE_EFFECT = Object.freeze({
  effect: 'knockdown',
  durationMs: 3_000,
}) satisfies Readonly<Mir4SkillEffect>;

const BARBARIC_CHARGE_PROJECTION = Object.freeze({
  skillId: 1103,
  sourceAttackId: 110107,
  nativeTargetCap: 10,
  effect: BARBARIC_CHARGE_EFFECT,
}) satisfies Mir4NativeRuntimeSkillEffectProjection;

const CUTTER_PROJECTION = Object.freeze({
  skillId: 1104,
  sourceAttackId: 110402,
  nativeTargetCap: 8,
  effect: CUTTER_EFFECT,
}) satisfies Mir4NativeRuntimeSkillEffectProjection;

const BODY_CHECK_EFFECT = Object.freeze({
  effect: 'knockdown',
  durationMs: 3_000,
  areaOrigin: 'actor',
  areaShape: 'frontal-strip',
  areaLengthPx: 128,
  areaWidthPx: 80,
  maxSecondaryTargets: 7,
  secondaryDamageBasisPoints: 10_000,
  chargeToTarget: true,
}) satisfies Readonly<Mir4SkillEffect>;

const BODY_CHECK_PROJECTION = Object.freeze({
  skillId: 1304,
  sourceAttackId: 130402,
  nativeTargetCap: 8,
  effect: BODY_CHECK_EFFECT,
}) satisfies Mir4NativeRuntimeSkillEffectProjection;

const GROUND_SMASH_EFFECT = Object.freeze({
  effect: 'knockdown',
  durationMs: 2_490,
}) satisfies Readonly<Mir4SkillEffect>;

const GROUND_SMASH_PROJECTION = Object.freeze({
  skillId: 1401,
  sourceAttackId: 140102,
  nativeTargetCap: 8,
  effect: GROUND_SMASH_EFFECT,
}) satisfies Mir4NativeRuntimeSkillEffectProjection;

const UNBREAKABLE_STANCE_EFFECT = Object.freeze({
  effect: 'area-impact',
  areaRadiusPx: 112,
  maxSecondaryTargets: 7,
  secondaryDamageBasisPoints: 10_000,
}) satisfies Readonly<Mir4SkillEffect>;

const UNBREAKABLE_STANCE_PROJECTION = Object.freeze({
  skillId: 1502,
  sourceAttackId: 150202,
  nativeTargetCap: 8,
  effect: UNBREAKABLE_STANCE_EFFECT,
}) satisfies Mir4NativeRuntimeSkillEffectProjection;

const MAGIC_SHIELD_EFFECT = Object.freeze({
  effect: 'magic-shield',
  subject: 'actor',
  utility: 'shield',
}) satisfies Readonly<Mir4SkillEffect>;

const MAGIC_SHIELD_PROJECTION = Object.freeze({
  skillId: 2503,
  sourceAttackId: 250301,
  nativeTargetCap: 8,
  effect: MAGIC_SHIELD_EFFECT,
}) satisfies Mir4NativeRuntimeSkillEffectProjection;

const HEAL_EFFECT = Object.freeze({
  effect: 'heal-pulse',
  subject: 'party',
  utility: 'heal',
  healSpellAttackBasisPoints: 3_600,
  healSpellAttackLevelUpBasisPoints: 200,
  healFlat: 100,
  healPulseCount: 5,
  healPulseIntervalMs: 1_000,
  partyRadiusPx: 480,
  maxPartyTargets: 5,
}) satisfies Readonly<Mir4SkillEffect>;

const HEAL_PROJECTION = Object.freeze({
  skillId: 3503,
  sourceAttackId: 350301,
  nativeTargetCap: 5,
  effect: HEAL_EFFECT,
}) satisfies Mir4NativeRuntimeSkillEffectProjection;

const EFFECT_POLICIES = new Map<number, Mir4NativeRuntimeSkillEffectPolicy>([
  [
    1103,
    Object.freeze({
      projection: BARBARIC_CHARGE_PROJECTION,
      validatesCrowdControlReaction: true,
      geometry: Object.freeze({
        kind: 'actor-circle' as const,
        radiusMinYards: 0,
        radiusMaxYards: 6,
        heightYards: 4,
        forwardOffsetYards: 0,
      }),
    }),
  ],
  [
    1104,
    Object.freeze({
      projection: CUTTER_PROJECTION,
      validatesCrowdControlReaction: true,
      geometry: Object.freeze({
        kind: 'frontal-strip' as const,
        lengthYards: 7,
        widthYards: 5.5,
        heightYards: 4,
      }),
    }),
  ],
  [
    1304,
    Object.freeze({
      projection: BODY_CHECK_PROJECTION,
      validatesCrowdControlReaction: true,
      geometry: Object.freeze({
        kind: 'frontal-strip' as const,
        lengthYards: 8,
        widthYards: 5,
        heightYards: 4,
      }),
    }),
  ],
  [
    1401,
    Object.freeze({
      projection: GROUND_SMASH_PROJECTION,
      validatesCrowdControlReaction: true,
      geometry: Object.freeze({
        kind: 'actor-circle' as const,
        radiusMinYards: 0,
        radiusMaxYards: 5,
        heightYards: 4,
        forwardOffsetYards: 1.5,
      }),
    }),
  ],
  [
    1502,
    Object.freeze({
      projection: UNBREAKABLE_STANCE_PROJECTION,
      validatesCrowdControlReaction: false,
      geometry: Object.freeze({
        kind: 'actor-circle' as const,
        radiusMinYards: 0,
        radiusMaxYards: 7,
        heightYards: 4,
        forwardOffsetYards: 0,
      }),
    }),
  ],
  [
    2503,
    Object.freeze({
      projection: MAGIC_SHIELD_PROJECTION,
      validatesCrowdControlReaction: false,
      geometry: Object.freeze({
        kind: 'actor-circle' as const,
        radiusMinYards: 0,
        radiusMaxYards: 4.5,
        heightYards: 4,
        forwardOffsetYards: 0,
      }),
    }),
  ],
  [
    3503,
    Object.freeze({
      projection: HEAL_PROJECTION,
      validatesCrowdControlReaction: false,
      geometry: Object.freeze({
        kind: 'actor-circle' as const,
        radiusMinYards: 0,
        radiusMaxYards: 30,
        heightYards: 4,
        forwardOffsetYards: 0,
      }),
    }),
  ],
]);

function failure(
  code: Mir4NativeRuntimeSkillEffectIssueCode,
  path: string,
): Mir4NativeRuntimeSkillEffectCompileResult {
  return Object.freeze({
    ok: false as const,
    issues: Object.freeze([Object.freeze({ code, path })]),
  });
}

function sameEffect(actual: Mir4SkillEffect | null, expected: Readonly<Mir4SkillEffect>): boolean {
  if (actual === null) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every(
      (key, index) =>
        key === expectedKeys[index] &&
        actual[key as keyof Mir4SkillEffect] === expected[key as keyof Mir4SkillEffect],
    )
  );
}

/**
 * Admit only runtime effects whose native target, control, and conversion
 * consumers are all recovered. Legacy catalogue fields are accepted only as
 * exact per-skill projections, never as general authorial effect semantics.
 */
export function compileMir4NativeRuntimeSkillEffect(
  action: Mir4NativeSkillAction,
  skill: Mir4SkillDef,
): Mir4NativeRuntimeSkillEffectCompileResult {
  const policy = EFFECT_POLICIES.get(action.skillId);
  if (!policy || action.skillId !== skill.skillId) {
    return failure('source-mismatch', 'skillId');
  }
  const { projection } = policy;
  if (action.skillId === 3503) {
    const healPolicy = mir4NativeHealPolicy(1);
    if (
      !healPolicy ||
      action.rows.length !== 3 ||
      action.rows[0]?.attackId !== 350301 ||
      action.rows[1]?.attackId !== 350302 ||
      action.rows[2]?.attackId !== 350303
    ) {
      return failure('native-effect-mismatch', 'action.rows');
    }
    if (!sameEffect(skill.effect, projection.effect)) {
      return failure('runtime-effect-mismatch', 'skill.effect');
    }
    return Object.freeze({ ok: true as const, projection });
  }
  const row = action.rows.find((candidate) => candidate.attackId === projection.sourceAttackId);
  const rowPath = `action.rows[${projection.sourceAttackId}]`;
  if (!row) return failure('native-effect-mismatch', rowPath);

  let geometryMatches = false;
  try {
    if (policy.geometry.kind === 'actor-circle') {
      const geometry = compileMir4NativeImpactType2CircleGeometry(row);
      geometryMatches =
        row.viewTarget === 2 &&
        geometry.radiusMinYards === policy.geometry.radiusMinYards &&
        geometry.radiusMaxYards === policy.geometry.radiusMaxYards &&
        geometry.heightYards === policy.geometry.heightYards &&
        geometry.forwardOffsetYards === policy.geometry.forwardOffsetYards &&
        geometry.targetCap === projection.nativeTargetCap;
    } else {
      const geometry = compileMir4NativeImpactType3Geometry(row);
      geometryMatches =
        row.viewTarget === 0 &&
        geometry.lengthYards === policy.geometry.lengthYards &&
        geometry.widthYards === policy.geometry.widthYards &&
        geometry.heightYards === policy.geometry.heightYards &&
        geometry.targetCap === projection.nativeTargetCap;
    }
  } catch {
    return failure('native-effect-mismatch', rowPath);
  }
  if (
    !geometryMatches ||
    row.targetType !== 1 ||
    row.targetSubtype !== 'alive-only' ||
    (policy.validatesCrowdControlReaction &&
      (!mir4NativeCrowdControlReactionMatchesRow(row) ||
        mir4NativeServerCrowdControlWindowMs(row) !== projection.effect.durationMs))
  ) {
    return failure('native-effect-mismatch', rowPath);
  }
  if (!sameEffect(skill.effect, projection.effect)) {
    return failure('runtime-effect-mismatch', 'skill.effect');
  }
  return Object.freeze({ ok: true as const, projection });
}

/** Runtime lookup remains closed to fully reconciled projections. */
export function mir4NativeRuntimeSkillEffect(
  skillId: number,
): Mir4NativeRuntimeSkillEffectProjection | null {
  if (!EFFECT_POLICIES.has(skillId)) return null;
  const action = mir4NativeDirectSkillActionEvidenceById(skillId);
  const skill = mir4SkillById(skillId);
  if (!action || !skill) return null;
  const compiled = compileMir4NativeRuntimeSkillEffect(action, skill);
  return compiled.ok ? compiled.projection : null;
}
