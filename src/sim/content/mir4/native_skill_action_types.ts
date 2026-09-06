export type Mir4NativeMovementKind = 'none' | 'target' | 'direct' | 'forward';

export type Mir4NativeTargetSubtype = 'alive-only' | 'dead-only' | 'all';

export type Mir4NativeCrowdControlKind =
  | 'none'
  | 'hit'
  | 'stun'
  | 'taunt'
  | 'petrification'
  | 'knock-back'
  | 'knock-down'
  | 'knock-front'
  | 'push-to-point'
  | 'sleep'
  | 'attack-back';

export type Mir4NativeCrowdControlStance =
  | 'none'
  | 'hit-01'
  | 'hit-02'
  | 'hit-03'
  | 'stun-01'
  | 'down-01'
  | 'down-02'
  | 'down-03'
  | 'hover-01'
  | 'air-01'
  | 'state-end';

export interface Mir4NativeVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type Mir4NativeSkillType = 1 | 3;
export type Mir4NativeSkillProductType = 0 | 2 | 3 | 4;
export type Mir4NativeConditionTarget = 0 | 1 | 2;
export type Mir4NativeConditionType = 0 | 1 | 5;
export type Mir4NativeSkillDamageType = 0 | 1;
export type Mir4NativeAbilityType =
  | 0
  | 20
  | 22
  | 24
  | 26
  | 28
  | 29
  | 44
  | 47
  | 2004
  | 2021
  | 2022
  | 2027
  | 4011;

export type Mir4NativeAttackUseType = 0 | 1;
export type Mir4NativeBulletType = 1 | 2;
export type Mir4NativeBulletMoveType = 1 | 3;
export type Mir4NativeActType = 0 | 2;
export type Mir4NativeSuperIgnore = 0 | 100 | 1000;
export type Mir4NativeSuperArmor = 0 | 9000;
export type Mir4NativeCcUserCheck = 0 | 1000;
export type Mir4NativeHitRagePoint = 240 | 320 | 400;
export type Mir4NativeAggroRate = 0 | 5000 | 7000 | 7500 | 8000 | 10000 | 20000;
export type Mir4NativeRawTargetSubtype = 'TARGET_SUBTYPE::AliveOnly' | 'TARGET_SUBTYPE::DeadOnly';

export interface Mir4NativeSourceHash {
  readonly fileName: 'SKILL.json' | 'SKILL_ATTACK.json';
  readonly sha256: string;
}

export interface Mir4NativeReferencedSource {
  readonly fileName: 'TOTEM.json' | 'BUFF.json';
  readonly status: 'referenced-ids-only';
}

/**
 * Exact source-file provenance for the direct native action projection. Referenced
 * Totem and Buff payloads remain deliberately outside this catalog until their graphs
 * are materialized and independently fingerprinted.
 */
export const MIR4_NATIVE_BEHAVIOR_PROVENANCE = Object.freeze({
  sources: Object.freeze([
    Object.freeze({
      fileName: 'SKILL.json' as const,
      sha256: 'b3cef975e878aeadfa14d467f730f47a3352be288a27b897640ad5cc07d73026',
    }),
    Object.freeze({
      fileName: 'SKILL_ATTACK.json' as const,
      sha256: 'a71fabdfff8883483566b622d2c909b946c015268b6da5a727459615106bba8c',
    }),
  ] satisfies readonly Mir4NativeSourceHash[]),
  referencedSources: Object.freeze([
    Object.freeze({ fileName: 'TOTEM.json' as const, status: 'referenced-ids-only' as const }),
    Object.freeze({ fileName: 'BUFF.json' as const, status: 'referenced-ids-only' as const }),
  ] satisfies readonly Mir4NativeReferencedSource[]),
});

export interface Mir4NativeRawCoefficientChannel {
  readonly coefficient: number;
  readonly levelUpCoefficient: number;
  readonly additive: number;
  readonly levelUpAdditive: number;
}

export interface Mir4NativeSkillAbilityEvidence {
  readonly type: Mir4NativeAbilityType;
  readonly value: number;
  readonly levelUpValue: number;
  readonly time: number;
}

export interface Mir4NativeSkillBehaviorEvidence {
  readonly source: 'SKILL.json';
  readonly skillType: Mir4NativeSkillType;
  readonly productType: Mir4NativeSkillProductType;
  readonly useControlTime: number;
  readonly conditionTarget: Mir4NativeConditionTarget;
  readonly conditionType: Mir4NativeConditionType;
  readonly conditionValue: number;
  readonly conditionRange: number;
  readonly conditionCheckTime: number;
  readonly chainUseSkillLevel: number;
  readonly chainSkillId: number;
  readonly chainSkillDelay: number;
  readonly chainSkillCount: number;
  readonly secondaryCostType: 0 | 3;
  readonly secondaryCost: 0 | 10000;
  readonly darkChange: 0 | 1 | 3;
  readonly damageType: Mir4NativeSkillDamageType;
  readonly primaryDamage: Mir4NativeRawCoefficientChannel;
  readonly secondaryDamage: Mir4NativeRawCoefficientChannel;
  readonly abilities: readonly [
    Mir4NativeSkillAbilityEvidence,
    Mir4NativeSkillAbilityEvidence,
    Mir4NativeSkillAbilityEvidence,
    Mir4NativeSkillAbilityEvidence,
  ];
  readonly stateConditionUse: boolean;
  readonly moveConditionUse: boolean;
  readonly passiveIds: readonly number[];
  readonly smiteBuffIds: readonly number[];
  readonly autoLearnPassiveIds: readonly number[];
  readonly skillModPassiveIds: readonly number[];
}

export interface Mir4NativeProjectileEvidence {
  readonly bulletType: Mir4NativeBulletType;
  readonly moveType: Mir4NativeBulletMoveType;
  readonly count: number;
  readonly speed: number;
  readonly lifetime: number;
  readonly socketName: string;
  readonly launchGapDelay: number;
  readonly effectId: number;
  readonly effectScale: number;
  readonly curveData: string;
  readonly speedData: string;
  readonly rotationOffset: Mir4NativeVector;
  readonly angleSpeed: number;
  readonly curveTime: number;
  readonly nativeHeight: number;
}

export interface Mir4NativeTotemEvidence {
  readonly id: number;
  readonly target: 0 | 1;
  readonly time: number;
  readonly count: number;
}

export interface Mir4NativeAttackBehaviorEvidence {
  readonly source: 'SKILL_ATTACK.json';
  readonly attackUseType: Mir4NativeAttackUseType;
  readonly rawTargetSubtype: Mir4NativeRawTargetSubtype;
  readonly impactSpawnType: number;
  readonly strikeDelay: number;
  readonly projectile: Mir4NativeProjectileEvidence | null;
  readonly totem: Mir4NativeTotemEvidence | null;
  readonly buffIds: readonly number[];
  readonly ccBuffIds: readonly number[];
  readonly superIgnore: Mir4NativeSuperIgnore;
  readonly superArmor: Mir4NativeSuperArmor;
  readonly actType: Mir4NativeActType;
  readonly ccUserCheck: Mir4NativeCcUserCheck;
  readonly attackRagePoint: number;
  readonly hitRagePoint: Mir4NativeHitRagePoint;
  readonly aggroRate: Mir4NativeAggroRate;
  readonly damageType: 0 | 1 | 2 | 3;
  readonly damageAttribute: 0 | 1 | 2 | 3 | 5 | 6;
  readonly physicalDamage: Mir4NativeRawCoefficientChannel;
  readonly magicDamage: Mir4NativeRawCoefficientChannel;
  readonly monsterScaleApply: boolean;
}

export interface Mir4NativeSkillMovement {
  readonly kind: Mir4NativeMovementKind;
  readonly nativeRange: number;
  readonly delayMs: number;
  readonly durationMs: number;
}

export interface Mir4NativeSkillGeometry {
  readonly angleDegrees: number;
  readonly nativeDistanceMin: number;
  readonly nativeDistanceMax: number;
  readonly nativeWidth: number;
  readonly nativeHeight: number;
  readonly nativeOffset: Mir4NativeVector;
  readonly rotationDegrees: number;
}

export interface Mir4NativeSkillDamage {
  readonly type: number;
  readonly coefficient: number;
  readonly levelUpCoefficient: number;
  readonly attribute: number;
}

export interface Mir4NativeHitReaction {
  readonly kind: Mir4NativeCrowdControlKind;
  readonly stance: Mir4NativeCrowdControlStance;
  readonly value: number;
  readonly nativeHeight: number;
  /** Raw CrowdControlValueEx seconds; the native server adds this to CrowdControlTime. */
  readonly valueEx: number;
  /** Raw CrowdControlTime only, not the effective native server state window. */
  readonly durationMs: number;
  /** Raw HitReactionProb presentation field; not the server CC land chance. */
  readonly probabilityPercent: number;
  readonly direction: number;
}

export interface Mir4NativeSkillAttackRow {
  readonly attackId: number;
  readonly nativeBehavior: Mir4NativeAttackBehaviorEvidence;
  readonly mainAttack: number;
  readonly nextAttackId: number;
  readonly impactStartMs: number;
  readonly movement: Mir4NativeSkillMovement;
  readonly viewTarget: number;
  readonly targetDistance: {
    readonly nativeMin: number;
    readonly nativeMax: number;
  };
  readonly targetType: number;
  /** Authored TargetValue; normal 60189 does not prove this as a server cap. */
  readonly authorialTargetValue: number;
  readonly targetSubtype: Mir4NativeTargetSubtype;
  readonly impactType: number;
  readonly impactOffsetsMs: readonly number[];
  readonly geometry: Mir4NativeSkillGeometry;
  readonly damage: Mir4NativeSkillDamage;
  readonly reaction: Mir4NativeHitReaction;
  readonly guideEffectId: number;
}

export interface Mir4NativeSkillIndicator {
  readonly type: number;
  readonly index: number;
  readonly angleDegrees: number;
  readonly nativeMin: number;
  readonly nativeMax: number;
  readonly nativeWidth: number;
  readonly nativeOffset: number;
  readonly nativeHeight: number;
}

export type Mir4NativeAnimationBindingConfidence =
  | 'exact-blueprint-state'
  | 'corroborated-asset'
  | 'unresolved';

export interface Mir4NativeSkillPresentation {
  /** Null until an extracted native source binds a clip to this skill. */
  readonly animationAssetPath: string | null;
  readonly animationBindingConfidence: Mir4NativeAnimationBindingConfidence;
  readonly vfxAssetPaths: readonly string[];
  readonly guideAssetPaths: readonly string[];
  readonly soundAssetPaths: readonly string[];
  readonly cameraCurveAssetPaths: readonly string[];
  readonly cameraShakeAssetPaths: readonly string[];
}

export interface Mir4NativeSkillAction {
  readonly skillId: number;
  readonly nativeBehavior: Mir4NativeSkillBehaviorEvidence;
  readonly cooldownMs: number;
  readonly skillCostType: number;
  readonly skillCost: number;
  readonly attackAnimationMs: number;
  readonly endCutAnimationMs: number;
  readonly hitCount: number;
  readonly requiredClassLevel: number;
  readonly targeting: boolean;
  readonly blockingCheck: number;
  readonly indicator: Mir4NativeSkillIndicator;
  readonly presentation: Mir4NativeSkillPresentation;
  readonly rows: readonly Mir4NativeSkillAttackRow[];
}

export function freezeMir4NativeSkillAction(action: Mir4NativeSkillAction): Mir4NativeSkillAction {
  const { nativeBehavior, ...runtimeShape } = action;
  const frozen = {
    ...runtimeShape,
    indicator: Object.freeze({ ...action.indicator }),
    presentation: Object.freeze({
      ...action.presentation,
      vfxAssetPaths: Object.freeze([...action.presentation.vfxAssetPaths]),
      guideAssetPaths: Object.freeze([...action.presentation.guideAssetPaths]),
      soundAssetPaths: Object.freeze([...action.presentation.soundAssetPaths]),
      cameraCurveAssetPaths: Object.freeze([...action.presentation.cameraCurveAssetPaths]),
      cameraShakeAssetPaths: Object.freeze([...action.presentation.cameraShakeAssetPaths]),
    }),
    rows: Object.freeze(action.rows.map(freezeMir4NativeSkillAttackRow)),
  };
  // Evidence is intentionally non-enumerable so adding it cannot alter the legacy
  // runtime/serialization shape. It remains a required, directly readable property.
  Object.defineProperty(frozen, 'nativeBehavior', {
    value: freezeMir4NativeSkillBehavior(nativeBehavior),
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(frozen) as Mir4NativeSkillAction;
}

function freezeMir4NativeSkillAttackRow(row: Mir4NativeSkillAttackRow): Mir4NativeSkillAttackRow {
  const { nativeBehavior, ...runtimeShape } = row;
  const frozen = {
    ...runtimeShape,
    movement: Object.freeze({ ...row.movement }),
    targetDistance: Object.freeze({ ...row.targetDistance }),
    impactOffsetsMs: Object.freeze([...row.impactOffsetsMs]),
    geometry: Object.freeze({
      ...row.geometry,
      nativeOffset: Object.freeze({ ...row.geometry.nativeOffset }),
    }),
    damage: Object.freeze({ ...row.damage }),
    reaction: Object.freeze({ ...row.reaction }),
  };
  Object.defineProperty(frozen, 'nativeBehavior', {
    value: freezeMir4NativeAttackBehavior(nativeBehavior),
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(frozen) as Mir4NativeSkillAttackRow;
}

function freezeMir4NativeSkillBehavior(
  behavior: Mir4NativeSkillBehaviorEvidence,
): Mir4NativeSkillBehaviorEvidence {
  return Object.freeze({
    ...behavior,
    primaryDamage: Object.freeze({ ...behavior.primaryDamage }),
    secondaryDamage: Object.freeze({ ...behavior.secondaryDamage }),
    abilities: Object.freeze(
      behavior.abilities.map((ability) => Object.freeze({ ...ability })),
    ) as Mir4NativeSkillBehaviorEvidence['abilities'],
    passiveIds: Object.freeze([...behavior.passiveIds]),
    smiteBuffIds: Object.freeze([...behavior.smiteBuffIds]),
    autoLearnPassiveIds: Object.freeze([...behavior.autoLearnPassiveIds]),
    skillModPassiveIds: Object.freeze([...behavior.skillModPassiveIds]),
  });
}

function freezeMir4NativeAttackBehavior(
  behavior: Mir4NativeAttackBehaviorEvidence,
): Mir4NativeAttackBehaviorEvidence {
  return Object.freeze({
    ...behavior,
    projectile:
      behavior.projectile === null
        ? null
        : Object.freeze({
            ...behavior.projectile,
            rotationOffset: Object.freeze({ ...behavior.projectile.rotationOffset }),
          }),
    totem: behavior.totem === null ? null : Object.freeze({ ...behavior.totem }),
    buffIds: Object.freeze([...behavior.buffIds]),
    ccBuffIds: Object.freeze([...behavior.ccBuffIds]),
    physicalDamage: Object.freeze({ ...behavior.physicalDamage }),
    magicDamage: Object.freeze({ ...behavior.magicDamage }),
  });
}

export const MIR4_NATIVE_NONE_MOVEMENT = Object.freeze({
  kind: 'none' as const,
  nativeRange: 0,
  delayMs: 0,
  durationMs: 0,
});

export const MIR4_NATIVE_NO_REACTION = Object.freeze({
  kind: 'none' as const,
  stance: 'none' as const,
  value: 0,
  nativeHeight: 0,
  valueEx: 0,
  durationMs: 0,
  probabilityPercent: 0,
  direction: 0,
});

export const MIR4_NATIVE_HIT_REACTION = Object.freeze({
  kind: 'hit' as const,
  stance: 'hit-01' as const,
  value: 0,
  nativeHeight: 0,
  valueEx: 0,
  durationMs: 200,
  probabilityPercent: 100,
  direction: 0,
});
